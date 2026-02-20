import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../../mocks/prisma';

// Mock modules before importing route handlers
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
import { GET, PUT } from '@/app/api/settings/route';

const mockSession = {
  user: { id: 'user-123', email: 'test@example.com' },
};

describe('/api/settings', () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockReset();
  });

  describe('GET', () => {
    it('returns 401 when not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const res = await GET();
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error).toBe('Unauthorized');
    });

    it('selects the correct fields from User model', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        password: 'hashed',
        apiKey: 'sk-ant-test',
        model: 'claude-sonnet-4-6',
        templates: [{ id: '1', name: 'T1', prompt: 'P1' }],
        draftText: 'some draft',
        createdAt: new Date(),
      });

      await GET();

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        select: {
          apiKey: true,
          model: true,
          templates: true,
          draftText: true,
        },
      });
    });

    it('returns settings with correct shape', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        password: 'hashed',
        apiKey: 'sk-ant-test-key',
        model: 'claude-opus-4-6',
        templates: [{ id: '1', name: 'Translate', prompt: 'Translate to Spanish' }],
        draftText: 'My draft text',
        createdAt: new Date(),
      });

      const res = await GET();
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual({
        apiKey: 'sk-ant-test-key',
        model: 'claude-opus-4-6',
        templates: [{ id: '1', name: 'Translate', prompt: 'Translate to Spanish' }],
        draftText: 'My draft text',
      });
    });

    it('returns empty defaults when fields are null', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        password: 'hashed',
        apiKey: null,
        model: 'claude-sonnet-4-6',
        templates: [],
        draftText: null,
        createdAt: new Date(),
      });

      const res = await GET();
      const body = await res.json();

      expect(body.apiKey).toBe('');
      expect(body.draftText).toBe('');
    });

    it('returns 404 when user not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      prismaMock.user.findUnique.mockResolvedValue(null);

      const res = await GET();
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error).toBe('User not found');
    });

    it('returns 500 when Prisma throws (e.g. missing column)', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      prismaMock.user.findUnique.mockRejectedValue(
        new Error('Unknown field `apiKey` for select statement on model `User`')
      );

      const res = await GET();
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe('Internal server error');
    });
  });

  describe('PUT', () => {
    const makeRequest = (body: Record<string, unknown>) =>
      new Request('http://localhost/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

    it('returns 401 when not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const res = await PUT(makeRequest({ apiKey: 'test' }));
      expect(res.status).toBe(401);
    });

    it('saves apiKey to the user record', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      prismaMock.user.update.mockResolvedValue({} as never);

      const res = await PUT(makeRequest({ apiKey: 'sk-ant-new-key' }));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.ok).toBe(true);
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { apiKey: 'sk-ant-new-key' },
      });
    });

    it('saves model preference', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      prismaMock.user.update.mockResolvedValue({} as never);

      await PUT(makeRequest({ model: 'claude-opus-4-6' }));

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { model: 'claude-opus-4-6' },
      });
    });

    it('saves templates array', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      prismaMock.user.update.mockResolvedValue({} as never);

      const templates = [
        { id: '1', name: 'Translate', prompt: 'Translate to French' },
        { id: '2', name: 'Summarize', prompt: 'Summarize this' },
      ];

      await PUT(makeRequest({ templates }));

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { templates },
      });
    });

    it('saves draftText', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      prismaMock.user.update.mockResolvedValue({} as never);

      await PUT(makeRequest({ draftText: 'My long draft text here...' }));

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { draftText: 'My long draft text here...' },
      });
    });

    it('sets apiKey to null when empty string', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      prismaMock.user.update.mockResolvedValue({} as never);

      await PUT(makeRequest({ apiKey: '' }));

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { apiKey: null },
      });
    });

    it('sets draftText to null when empty string', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      prismaMock.user.update.mockResolvedValue({} as never);

      await PUT(makeRequest({ draftText: '' }));

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { draftText: null },
      });
    });

    it('saves multiple fields at once', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      prismaMock.user.update.mockResolvedValue({} as never);

      await PUT(makeRequest({
        apiKey: 'sk-ant-key',
        model: 'claude-haiku-4-5',
        draftText: 'draft',
      }));

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          apiKey: 'sk-ant-key',
          model: 'claude-haiku-4-5',
          draftText: 'draft',
        },
      });
    });

    it('returns 400 for invalid templates shape', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);

      const res = await PUT(makeRequest({
        templates: [{ bad: 'shape' }],
      }));

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('Invalid input');
    });

    it('returns 500 when Prisma update throws (e.g. missing column)', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      prismaMock.user.update.mockRejectedValue(
        new Error('Unknown arg `apiKey` in data for type UserUpdateInput')
      );

      const res = await PUT(makeRequest({ apiKey: 'test' }));
      expect(res.status).toBe(500);
    });
  });
});
