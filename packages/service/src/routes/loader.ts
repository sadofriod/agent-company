import { readdir } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Express, NextFunction, Request, RequestHandler, Response } from 'express';

import { sendErrorResponse } from './_shared/response';

const ROUTE_FILE_EXTENSION_PATTERN = /\.(?:[cm]?ts|[cm]?js)$/;

const HTTP_METHODS = {
	all: 'all',
	delete: 'delete',
	head: 'head',
	get: 'get',
	options: 'options',
	patch: 'patch',
	post: 'post',
	put: 'put',
} as const;

type HttpMethod = keyof typeof HTTP_METHODS;

type RouteDefinition = {
	readonly handler: RequestHandler;
	readonly middlewares?: readonly RequestHandler[];
};

type RouteModule = {
	readonly default?: RequestHandler | RouteDefinition;
	readonly handler?: RequestHandler;
	readonly middlewares?: readonly RequestHandler[];
};

type RouteEntry = {
	readonly filePath: string;
	readonly method: HttpMethod;
	readonly routePath: string;
	readonly route: RouteDefinition;
};

const isHttpMethod = (value: string): value is HttpMethod => value in HTTP_METHODS;

const toRouteSegment = (segment: string): string => {
	const matchedParameter = /^\[([A-Za-z0-9_]+)\]$/.exec(segment);

	if (matchedParameter === null) {
		return segment;
	}

	return `:${matchedParameter[1]}`;
};

const toRoutePath = (filePath: string, routesDirectory: string): string => {
	const relativeFilePath = relative(routesDirectory, filePath);
	const parentDirectory = relativeFilePath.split(sep).slice(0, -1);
	const segments = parentDirectory.map(toRouteSegment).filter((segment) => segment.length > 0);

	if (segments.length === 0) {
		return '/';
	}

	return `/${segments.join('/')}`;
};

const normalizeRouteModule = (module: RouteModule, filePath: string): RouteDefinition => {
	const defaultExport = module.default;

	if (typeof defaultExport === 'function') {
		return { handler: defaultExport };
	}

	if (defaultExport !== undefined && typeof defaultExport.handler === 'function') {
		return defaultExport;
	}

	if (typeof module.handler === 'function') {
		return {
			handler: module.handler,
			...(module.middlewares === undefined ? {} : { middlewares: module.middlewares }),
		};
	}

	throw new Error(`Route module must export a handler: ${filePath}`);
};

const collectRouteFiles = async (directoryPath: string): Promise<readonly string[]> => {
	const entries = await readdir(directoryPath, { withFileTypes: true });
	const nestedFiles = await Promise.all(
		entries.map(async (entry): Promise<readonly string[]> => {
			if (entry.name.startsWith('_') || entry.name.startsWith('.')) {
				return [];
			}

			const entryPath = join(directoryPath, entry.name);

			if (entry.isDirectory()) {
				return collectRouteFiles(entryPath);
			}

			if (!entry.isFile() || !ROUTE_FILE_EXTENSION_PATTERN.test(entry.name)) {
				return [];
			}

			return [entryPath];
		}),
	);

	return nestedFiles.flat().sort((left, right) => left.localeCompare(right));
};

const loadRouteEntries = async (routesDirectory: string): Promise<readonly RouteEntry[]> => {
	const files = await collectRouteFiles(routesDirectory);

	return Promise.all(
		files.flatMap((filePath) => {
			const fileName = filePath.split(sep).at(-1);

			if (fileName === undefined) {
				throw new Error(`Invalid route file path: ${filePath}`);
			}

			const methodName = fileName.replace(ROUTE_FILE_EXTENSION_PATTERN, '').toLowerCase();

			if (!isHttpMethod(methodName)) {
				return [];
			}

			return [
				(async (): Promise<RouteEntry> => {
					const routeModule = (await import(pathToFileURL(filePath).href)) as RouteModule;

					return {
						filePath,
						method: methodName,
						routePath: toRoutePath(filePath, routesDirectory),
						route: normalizeRouteModule(routeModule, filePath),
					};
				})(),
			];
		}),
	);
};

const applyRoute = (app: Express, routeEntry: RouteEntry): void => {
	const { handler, middlewares = [] } = routeEntry.route;

	app[HTTP_METHODS[routeEntry.method]](routeEntry.routePath, ...middlewares, handler);
	console.log(`[routes] ${routeEntry.method.toUpperCase()} ${routeEntry.routePath}`);
};

const notFoundHandler: RequestHandler = (_request: Request, response: Response): void => {
	sendErrorResponse(response, 404, {
		code: 'route_not_found',
		message: 'Route not found.',
	});
};

const errorHandler = (
	error: unknown,
	_request: Request,
	response: Response,
	_next: NextFunction,
): void => {
	const message = error instanceof Error ? error.message : 'Unexpected server error.';

	sendErrorResponse(response, 500, {
		code: 'internal_error',
		message,
	});
};

export const resolveRoutesDirectory = (routesDirectory: string | undefined, moduleUrl: string): string => {
	if (routesDirectory !== undefined) {
		return resolve(routesDirectory);
	}

	return resolve(fileURLToPath(new URL('./', moduleUrl)));
};

export const registerFileRoutes = async (
	app: Express,
	options: {
		readonly routesDirectory?: string;
		readonly moduleUrl: string;
	},
): Promise<void> => {
	const routesDirectory = resolveRoutesDirectory(options.routesDirectory, options.moduleUrl);
	const routeEntries = await loadRouteEntries(routesDirectory);

	for (const routeEntry of routeEntries) {
		applyRoute(app, routeEntry);
	}

	app.use(notFoundHandler);
	app.use(errorHandler);
};