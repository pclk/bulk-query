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

    const projects = await prisma.project.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        taskPrompt: true,
        processingMode: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ projects });
  } catch (error) {
    console.error('[projects] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  taskPrompt: z.string().min(1),
  rawText: z.string().min(1),
  chunks: z.array(z.unknown()),
  results: z.array(z.unknown()).nullable().optional(),
  processingMode: z.string().default('sequential'),
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const body = await request.json();
    const parsed = createProjectSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const project = await prisma.project.create({
      data: {
        ...parsed.data,
        chunks: parsed.data.chunks as [],
        results: parsed.data.results as [] ?? null,
        userId,
      },
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error('[projects] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
