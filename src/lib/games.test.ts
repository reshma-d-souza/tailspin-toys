/**
 * Tests build-time game data-access helpers against in-memory SQLite.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '../../db/test-helpers';
import { categories, publishers, games } from '../../db/schema';
import type { Database } from './db';
import {
    getAllGames,
    getAllGameIds,
    getGameById,
} from './games';

async function seedGames(
    db: Database,
    count: number,
): Promise<{ categoryIds: { strategy: number; puzzle: number }; publisherIds: { one: number; two: number } }> {
    const categoryRows = await db
        .insert(categories)
        .values([
            { name: 'Strategy', description: 'cat' },
            { name: 'Puzzle', description: 'cat' },
        ])
        .returning({ id: categories.id, name: categories.name });
    const publisherRows = await db
        .insert(publishers)
        .values([
            { name: 'Pub One', description: 'pub' },
            { name: 'Pub Two', description: 'pub' },
        ])
        .returning({ id: publishers.id, name: publishers.name });

    // Insert titles in reverse-alphabetical order to prove ordering is applied.
    for (let i = count; i >= 1; i--) {
        await db.insert(games).values({
            title: `Game ${String(i).padStart(2, '0')}`,
            description: `Description ${i}`,
            starRating: 4.2,
            categoryId: categoryRows[(i - 1) % 2].id,
            publisherId: publisherRows[i <= Math.ceil(count / 2) ? 0 : 1].id,
        });
    }

    return {
        categoryIds: {
            strategy: categoryRows[0].id,
            puzzle: categoryRows[1].id,
        },
        publisherIds: {
            one: publisherRows[0].id,
            two: publisherRows[1].id,
        },
    };
}

describe('games data-access helpers', () => {
    let db: Database;

    beforeEach(async () => {
        db = await createTestDatabase();
    });

    it('returns all games ordered by title', async () => {
        await seedGames(db, 3);
        const all = await getAllGames(db);
        expect(all.map((g) => g.title)).toEqual(['Game 01', 'Game 02', 'Game 03']);
        expect(all[0].category).toEqual({ id: expect.any(Number), name: 'Strategy' });
        expect(all[0].publisher).toEqual({ id: expect.any(Number), name: 'Pub One' });
    });

    it('filters games by one or more categories', async () => {
        const { categoryIds } = await seedGames(db, 4);

        const filtered = await getAllGames(db, { categoryIds: [categoryIds.strategy] });

        expect(filtered.map((game) => game.title)).toEqual(['Game 01', 'Game 03']);
    });

    it('filters games by publisher', async () => {
        const { publisherIds } = await seedGames(db, 4);

        const filtered = await getAllGames(db, { publisherId: publisherIds.two });

        expect(filtered.map((game) => game.title)).toEqual(['Game 03', 'Game 04']);
    });

    it('combines category and publisher filters', async () => {
        const { categoryIds, publisherIds } = await seedGames(db, 4);

        const filtered = await getAllGames(db, {
            categoryIds: [categoryIds.strategy],
            publisherId: publisherIds.two,
        });

        expect(filtered.map((game) => game.title)).toEqual(['Game 03']);
    });

    it('returns an empty collection when filters have no matches', async () => {
        const { categoryIds } = await seedGames(db, 4);

        const filtered = await getAllGames(db, {
            categoryIds: [categoryIds.puzzle],
            publisherId: 99999,
        });

        expect(filtered).toEqual([]);
    });

    it('returns all game ids ordered by title', async () => {
        await seedGames(db, 3);
        const ids = await getAllGameIds(db);
        const all = await getAllGames(db);
        expect(ids).toEqual(all.map((g) => g.id));
    });

    it('fetches a single game by id', async () => {
        await seedGames(db, 2);
        const ids = await getAllGameIds(db);
        const game = await getGameById(db, ids[0]);
        expect(game?.title).toBe('Game 01');
    });

    it('returns null for a non-existent game', async () => {
        await seedGames(db, 2);
        expect(await getGameById(db, 99999)).toBeNull();
    });
});
