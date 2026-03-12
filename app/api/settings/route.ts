import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        apiKey: true,
        model: true,
        templates: true,
        draftText: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      apiKey: user.apiKey || '',
      model: user.model,
      templates: user.templates,
      draftText: user.draftText || '',
    });
  } catch (error) {
    console.error('[settings] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const updateSettingsSchema = z.object({
  apiKey: z.string().optional(),
  model: z.string().optional(),
  templates: z.array(z.object({
    id: z.string(),
    name: z.string(),
    prompt: z.string(),
  })).optional(),
  draftText: z.string().optional(),
});

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const body = await request.json();
    const parsed = updateSettingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data: Record<string, unknown> = {};
    if (parsed.data.apiKey !== undefined) data.apiKey = parsed.data.apiKey || null;
    if (parsed.data.model !== undefined) data.model = parsed.data.model;
    if (parsed.data.templates !== undefined) data.templates = parsed.data.templates;
    if (parsed.data.draftText !== undefined) data.draftText = parsed.data.draftText || null;

    await prisma.user.update({
      where: { id: userId },
      data,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[settings] PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
