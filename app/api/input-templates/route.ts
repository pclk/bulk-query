import { NextResponse } from 'next/server';
import { loadInputTemplates } from '@/lib/input-templates';

export async function GET() {
  try {
    const templates = await loadInputTemplates();
    return NextResponse.json({ templates });
  } catch (error) {
    console.error('[input-templates] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to load input templates' },
      { status: 500 }
    );
  }
}
