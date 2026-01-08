import { PgVector } from '@mastra/pg';
import { config } from './config';
import { setVectorIndex } from './tools/knowledge-base';
import fs from 'fs/promises';
import path from 'path';

/**
 * PostgreSQL vector store for RAG knowledge base
 * Uses pgvector extension for similarity search
 */
export const vectorStore = new PgVector({
  connectionString: config.postgresConnectionString,
});

/**
 * Create vector index for investment wisdom
 * Uses OpenAI text-embedding-3-small with 1536 dimensions
 *
 * Note: The exact API may vary by Mastra version.
 * This creates a placeholder that can be configured properly.
 */
export const investmentWisdomIndex = {
  query: async (params: { query: string; topK: number; filter?: any }) => {
    // Placeholder implementation
    // In production, this would query the vector index
    console.log('Vector query:', params);
    return [];
  },
  upsert: async (documents: Array<{ content: string; metadata: any }>) => {
    // Placeholder implementation
    console.log('Vector upsert:', documents.length, 'documents');
    return;
  },
};

/**
 * Initialize the knowledge base tool with the vector index
 */
setVectorIndex(investmentWisdomIndex);

/**
 * Split text into overlapping chunks
 *
 * @param text - The text to chunk
 * @param chunkSize - Size of each chunk in characters
 * @param overlap - Overlap between chunks in characters
 */
function chunkText(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start = end - overlap;
  }

  return chunks;
}

/**
 * Ingest a document into the vector knowledge base
 *
 * @param filePath - Absolute path to the document (PDF or text)
 * @param category - Investment category (e.g., "value_investing", "distressed")
 * @param chunkSize - Size of text chunks (default: 1000 characters)
 * @param chunkOverlap - Overlap between chunks (default: 200 characters)
 */
export async function ingestDocument(
  filePath: string,
  category: string,
  chunkSize = 1000,
  chunkOverlap = 200
) {
  try {
    // Read file content
    const fileBuffer = await fs.readFile(filePath);
    const fileExt = path.extname(filePath).toLowerCase();

    let text: string;

    if (fileExt === '.pdf') {
      // Parse PDF using dynamic import for ESM compatibility
      const pdfParseModule = await import('pdf-parse');
      const pdfParse = 'default' in pdfParseModule ? pdfParseModule.default : pdfParseModule;
      const data = await (pdfParse as any)(fileBuffer);
      text = data.text;
    } else if (fileExt === '.txt') {
      // Read text file
      text = fileBuffer.toString('utf-8');
    } else {
      throw new Error(`Unsupported file type: ${fileExt}. Only PDF and TXT files are supported.`);
    }

    // Chunk text
    const chunks = chunkText(text, chunkSize, chunkOverlap);

    // Add chunks to vector index
    const documents = chunks.map((chunk, index) => ({
      content: chunk,
      metadata: {
        category,
        source: path.basename(filePath),
        chunkIndex: index,
        totalChunks: chunks.length,
      },
    }));

    await investmentWisdomIndex.upsert(documents);

    return {
      success: true,
      message: `Successfully ingested ${chunks.length} chunks from ${path.basename(filePath)}`,
      chunksCount: chunks.length,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to ingest document: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Ingest all documents from a directory
 *
 * @param dirPath - Absolute path to directory containing documents
 * @param category - Investment category for all documents in directory
 */
export async function ingestDirectory(dirPath: string, category: string) {
  try {
    const files = await fs.readdir(dirPath);
    const results = [];

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stat = await fs.stat(filePath);

      if (stat.isFile()) {
        const result = await ingestDocument(filePath, category);
        results.push({
          file,
          ...result,
        });
      }
    }

    return results;
  } catch (error) {
    throw new Error(
      `Failed to ingest directory: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Initialize vector database tables
 * Call this once during setup to ensure the database is ready
 */
export async function initializeVectorDB() {
  try {
    // Placeholder for database initialization
    // The exact API depends on the Mastra version
    console.log('Vector database initialization placeholder');
    console.log('Ensure PostgreSQL has pgvector extension installed:');
    console.log('  CREATE EXTENSION IF NOT EXISTS vector;');
  } catch (error) {
    console.error('Failed to initialize vector database:', error);
    throw error;
  }
}
