import {
  createDefaultAgentsDirectory,
  deleteAgentMarkdownFile,
  listAgentMarkdownFiles,
  readAgentMarkdownFile,
  resolveAgentMarkdownPath,
  validateAgentMarkdownFileDraft,
  writeAgentMarkdownFile,
} from '../agent/markdown';
import type { AgentMarkdownFileSummary } from '../agent/markdown';
import type { AgentMarkdownAdapter } from './agentMarkdownAdapter';
import {
  createAgentMarkdownMetadataInput,
  type AgentMarkdownMetadataRepository,
} from './agentMarkdownMetadataRepository';

export type LocalAgentMarkdownAdapterOptions = {
  readonly agentsDirectory?: string;
  readonly metadataRepository: AgentMarkdownMetadataRepository;
};

const resolveLocalStoragePath = (agentsDirectory: string, relativePath: string): string => {
  const resolvedPath = resolveAgentMarkdownPath(agentsDirectory, relativePath);

  if (!resolvedPath.ok) {
    return relativePath;
  }

  return resolvedPath.value.absolutePath;
};

export const createLocalAgentMarkdownAdapter = ({
  agentsDirectory = createDefaultAgentsDirectory(),
  metadataRepository,
}: LocalAgentMarkdownAdapterOptions): AgentMarkdownAdapter => {
  const upsertMetadata = async (summary: AgentMarkdownFileSummary): Promise<void> => {
    await metadataRepository.upsert(
      createAgentMarkdownMetadataInput({
        summary,
        storageProvider: 'local',
        storagePath: resolveLocalStoragePath(agentsDirectory, summary.path),
      }),
    );
  };

  return {
    list: async () => {
      const files = await listAgentMarkdownFiles(agentsDirectory);

      await Promise.all(files.map(upsertMetadata));

      return files;
    },
    read: async (candidatePath) => {
      const result = await readAgentMarkdownFile(candidatePath, agentsDirectory);

      if (result.ok) {
        await upsertMetadata(result.value);
      }

      return result;
    },
    validate: (candidatePath, content) => validateAgentMarkdownFileDraft(candidatePath, content, agentsDirectory),
    write: async ({ path, content, mode }) => {
      const result = await writeAgentMarkdownFile(path, content, mode, agentsDirectory);

      if (result.ok) {
        await upsertMetadata(result.value);
      }

      return result;
    },
    delete: async (candidatePath) => {
      const result = await deleteAgentMarkdownFile(candidatePath, agentsDirectory);

      if (result.ok) {
        await metadataRepository.delete(result.value.path);
      }

      return result;
    },
  };
};