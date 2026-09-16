/**
 * Tests build-time category data-access helpers against in-memory SQLite.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { categories } from '../../db/schema';
import { createTestDatabase } from '../../db/test-helpers';
import type { Database } from './db';
import { getAllCategories } from './categories';

describe('category data-access helpers', () => {
    let db: Database;

    beforeEach(async () => {
        db = await createTestDatabase();
    });

    it('returns categories ordered by name', async () => {
        await db.insert(categories).values([
            { name: 'Strategy', description: 'cat' },
            { name: 'Puzzle', description: 'cat' },
        ]);

        const result = await getAllCategories(db);

        expect(result.map((category) => category.name)).toEqual(['Puzzle', 'Strategy']);
    });

    it('returns an empty collection when no categories exist', async () => {
        expect(await getAllCategories(db)).toEqual([]);
    });
});
