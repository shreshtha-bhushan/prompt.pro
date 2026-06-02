'use server';

import { auth0 } from '@/lib/auth0';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

/** Helper to secure actions and retrieve logged-in user ID */
async function getAuthUserId(): Promise<string> {
  const session = await auth0.getSession();
  if (!session || !session.user) {
    throw new Error('Unauthorized access. Please sign in.');
  }
  const email = session.user.email;
  if (!email) {
    throw new Error('No email found in session.');
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    // If not found, provision just-in-time
    const name = session.user.name || null;
    const newUser = await prisma.user.create({
      data: { email, name },
    });
    return newUser.id;
  }

  return user.id;
}

/** Retrieve all dashboard data for the active user */
export async function getUserDashboardData() {
  try {
    const userId = await getAuthUserId();

    const [history, library, contextBlocks] = await Promise.all([
      prisma.historyItem.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.libraryItem.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.contextBlock.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    return {
      success: true,
      history,
      library,
      contextBlocks,
    };
  } catch (error: any) {
    console.error('Failed to get user dashboard data:', error);
    return {
      success: false,
      error: error.message || 'Internal server error',
      history: [],
      library: [],
      contextBlocks: [],
    };
  }
}

/** Save a new library entry */
export async function saveLibraryEntry(title: string, text: string) {
  try {
    const userId = await getAuthUserId();
    if (!title.trim() || !text.trim()) {
      throw new Error('Title and content are required.');
    }

    const newItem = await prisma.libraryItem.create({
      data: {
        userId,
        title: title.trim(),
        text: text.trim(),
      },
    });

    revalidatePath('/');
    return { success: true, item: newItem };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/** Delete a library entry */
export async function deleteLibraryEntry(id: string) {
  try {
    const userId = await getAuthUserId();

    // Ensure item belongs to the user before deleting
    const item = await prisma.libraryItem.findFirst({
      where: { id, userId },
    });

    if (!item) {
      throw new Error('Item not found or unauthorized.');
    }

    await prisma.libraryItem.delete({
      where: { id },
    });

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/** Save a new context block */
export async function addContextBlock(title: string, content: string) {
  try {
    const userId = await getAuthUserId();
    if (!title.trim() || !content.trim()) {
      throw new Error('Title and content are required.');
    }

    const newBlock = await prisma.contextBlock.create({
      data: {
        userId,
        title: title.trim(),
        content: content.trim(),
        active: false,
      },
    });

    revalidatePath('/');
    return { success: true, item: newBlock };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/** Delete a context block */
export async function deleteContextBlock(id: string) {
  try {
    const userId = await getAuthUserId();

    const block = await prisma.contextBlock.findFirst({
      where: { id, userId },
    });

    if (!block) {
      throw new Error('Block not found or unauthorized.');
    }

    await prisma.contextBlock.delete({
      where: { id },
    });

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/** Toggle a context block's active status */
export async function toggleContextBlock(id: string, active: boolean) {
  try {
    const userId = await getAuthUserId();

    const block = await prisma.contextBlock.findFirst({
      where: { id, userId },
    });

    if (!block) {
      throw new Error('Block not found or unauthorized.');
    }

    const updated = await prisma.contextBlock.update({
      where: { id },
      data: { active },
    });

    revalidatePath('/');
    return { success: true, item: updated };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/** Clear all history for the logged-in user */
export async function clearUserHistory() {
  try {
    const userId = await getAuthUserId();

    await prisma.historyItem.deleteMany({
      where: { userId },
    });

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/** Add an item to history */
export async function addHistoryItem(text: string, score?: number) {
  try {
    const userId = await getAuthUserId();
    if (!text.trim()) {
      throw new Error('History text is empty.');
    }

    const newItem = await prisma.historyItem.create({
      data: {
        userId,
        text: text.trim(),
        score: score ?? null,
      },
    });

    revalidatePath('/');
    return { success: true, item: newItem };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
