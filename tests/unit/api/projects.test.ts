import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../../mocks/prisma';

vi.mock('@/lib/db', () => ({
  prisma: prismaMock,
}));

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

import { getServerSession } from 'next-auth';
import { GET, POST } from '@/app/api/projects/route';

const mockSession = {
  user: { id: 'user-123', email: 'test@example.com' },
};

describe('/api/projects', () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockReset();
  });

  describe('GET', () => {
    it('returns 401 when not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const res = await GET();
      expect(res.status).toBe(401);
    });

    it('returns list of projects', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      prismaMock.project.findMany.mockResolvedValue([
        {
          id: 'proj-1',
          userId: 'user-123',
          name: 'Test Project',
          taskPrompt: 'Summarize',
          rawText: 'text',
          chunks: [],
          results: null,
          processingMode: 'sequential',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const res = await GET();
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.projects).toHaveLength(1);
      expect(body.projects[0].name).toBe('Test Project');
    });

    it('returns 500 when Prisma throws', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      prismaMock.project.findMany.mockRejectedValue(new Error('DB error'));

      const res = await GET();
      expect(res.status).toBe(500);
    });
  });

  describe('POST', () => {
    const makeRequest = (body: Record<string, unknown>) =>
      new Request('http://localhost/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

    const validProject = {
      name: 'My Project',
      rawText: 'Some text content',
      chunks: [{ id: '1', title: 'Chunk 1', text: 'hello' }],
    };

    it('returns 401 when not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const res = await POST(makeRequest(validProject));
      expect(res.status).toBe(401);
    });

    it('creates project with taskPrompt defaulting to empty string', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      prismaMock.project.create.mockResolvedValue({
        id: 'proj-new',
        userId: 'user-123',
        name: 'My Project',
        taskPrompt: '',
        rawText: 'Some text content',
        chunks: [],
        results: null,
        processingMode: 'sequential',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await POST(makeRequest(validProject));
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(prismaMock.project.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            taskPrompt: '',
            userId: 'user-123',
          }),
        })
      );
      expect(body.project).toBeDefined();
    });

    it('creates project with explicit taskPrompt', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      prismaMock.project.create.mockResolvedValue({} as never);

      await POST(makeRequest({
        ...validProject,
        taskPrompt: 'Translate to French',
      }));

      expect(prismaMock.project.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            taskPrompt: 'Translate to French',
          }),
        })
      );
    });

    it('returns 400 when name is missing', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);

      const res = await POST(makeRequest({
        rawText: 'Some text',
        chunks: [],
      }));

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('Invalid input');
    });

    it('returns 400 when rawText is missing', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);

      const res = await POST(makeRequest({
        name: 'Project',
        chunks: [],
      }));

      expect(res.status).toBe(400);
    });

    it('returns 500 when Prisma create throws (e.g. missing column)', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      prismaMock.project.create.mockRejectedValue(
        new Error('Unknown arg `taskPrompt` in data')
      );

      const res = await POST(makeRequest(validProject));
      expect(res.status).toBe(500);
    });
  });
});
