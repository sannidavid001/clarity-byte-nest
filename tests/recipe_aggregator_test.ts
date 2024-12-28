import {
  Clarinet,
  Tx,
  Chain,
  Account,
  types
} from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
    name: "Can add new recipe",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const wallet_1 = accounts.get('wallet_1')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('recipe-aggregator', 'add-recipe', [
                types.ascii("Vegan Pasta"),
                types.list([types.ascii("pasta"), types.ascii("tomatoes"), types.ascii("basil")]),
                types.list([types.ascii("vegan"), types.ascii("italian")])
            ], wallet_1.address)
        ]);
        
        block.receipts[0].result.expectOk().expectUint(0);
        
        let getRecipe = chain.mineBlock([
            Tx.contractCall('recipe-aggregator', 'get-recipe', [
                types.uint(0)
            ], wallet_1.address)
        ]);
        
        const recipe = getRecipe.receipts[0].result.expectOk().expectSome();
        assertEquals(recipe['name'], "Vegan Pasta");
    }
});

Clarinet.test({
    name: "Can rate recipe",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const wallet_1 = accounts.get('wallet_1')!;
        const wallet_2 = accounts.get('wallet_2')!;
        
        // First add a recipe
        let block = chain.mineBlock([
            Tx.contractCall('recipe-aggregator', 'add-recipe', [
                types.ascii("Vegan Pasta"),
                types.list([types.ascii("pasta"), types.ascii("tomatoes"), types.ascii("basil")]),
                types.list([types.ascii("vegan"), types.ascii("italian")])
            ], wallet_1.address)
        ]);
        
        // Then rate it
        let rateBlock = chain.mineBlock([
            Tx.contractCall('recipe-aggregator', 'rate-recipe', [
                types.uint(0),
                types.uint(5)
            ], wallet_2.address)
        ]);
        
        rateBlock.receipts[0].result.expectOk().expectBool(true);
        
        // Check rating
        let getRating = chain.mineBlock([
            Tx.contractCall('recipe-aggregator', 'get-recipe-rating', [
                types.uint(0)
            ], wallet_1.address)
        ]);
        
        const rating = getRating.receipts[0].result.expectOk();
        assertEquals(rating['rating'], types.uint(5));
        assertEquals(rating['count'], types.uint(1));
    }
});

Clarinet.test({
    name: "Can search by dietary tag",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const wallet_1 = accounts.get('wallet_1')!;
        
        // Add vegan recipe
        chain.mineBlock([
            Tx.contractCall('recipe-aggregator', 'add-recipe', [
                types.ascii("Vegan Pasta"),
                types.list([types.ascii("pasta"), types.ascii("tomatoes")]),
                types.list([types.ascii("vegan")])
            ], wallet_1.address)
        ]);
        
        let searchBlock = chain.mineBlock([
            Tx.contractCall('recipe-aggregator', 'get-recipes-by-tag', [
                types.ascii("vegan")
            ], wallet_1.address)
        ]);
        
        const results = searchBlock.receipts[0].result.expectOk();
        assertEquals(results.length, 1);
    }
});