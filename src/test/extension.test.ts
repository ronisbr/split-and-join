import * as assert from "assert";
import * as vscode from "vscode";

suite("Split and Join Extension Test Suite", () => {
    vscode.window.showInformationMessage("Start all tests.");

    test("Split Single-Line Arguments With Commas", async () => {
        const doc = await vscode.workspace.openTextDocument({
            content: "function test(a, b, c) {}",
            language: "typescript"
        });

        const editor = await vscode.window.showTextDocument(doc);

        // Position cursor inside parentheses.
        editor.selection = new vscode.Selection(0, 15, 0, 15);

        await vscode.commands.executeCommand("splitAndJoin.toggle");

        const text = doc.getText();

        assert.ok(text.includes("a,"),  "Should have a with comma");
        assert.ok(text.includes("b,"),  "Should have b with comma");
        assert.ok(text.includes("c\n"), "Should have c on new line");

        assert.strictEqual(doc.lineCount, 5, "Should have 5 lines after split");
    });

    test("Join Multi-Line Arguments Back to Single Line", async () => {
        const doc = await vscode.workspace.openTextDocument({
            content: "function test(\n    a,\n    b,\n    c\n) {}",
            language: "typescript"
        });

        const editor = await vscode.window.showTextDocument(doc);

        // Position cursor inside parentheses.
        editor.selection = new vscode.Selection(1, 2, 1, 2);

        await vscode.commands.executeCommand("splitAndJoin.toggle");

        const text = doc.getText();

        assert.ok(!text.includes("\n    a"), "Should not have a on separate line");
        assert.ok(text.includes("a, b, c"),  "Should have inline arguments");
    });

    test("Arrays With Square Brackets", async () => {
        const doc = await vscode.workspace.openTextDocument({
            content: "const arr = [1, 2, 3];",
            language: "typescript"
        });

        const editor = await vscode.window.showTextDocument(doc);

        // Position cursor inside brackets.
        editor.selection = new vscode.Selection(0, 14, 0, 14);

        await vscode.commands.executeCommand("splitAndJoin.toggle");

        const text = doc.getText();

        assert.ok(text.includes("1,"), "Should have 1 with comma");

        assert.strictEqual(doc.lineCount, 5, "Should have 5 lines after split");
    });

    test("Objects With Curly Braces", async () => {
        const doc = await vscode.workspace.openTextDocument({
            content: "const obj = {a: 1, b: 2};",
            language: "typescript"
        });

        const editor = await vscode.window.showTextDocument(doc);

        // Position cursor inside braces.
        editor.selection = new vscode.Selection(0, 15, 0, 15);

        await vscode.commands.executeCommand("splitAndJoin.toggle");

        const text = doc.getText();

        assert.ok(text.includes("a: 1,"), "Should have a: 1 with comma");
        assert.ok(text.includes("b: 2"),  "Should have b: 2");
    });

    test("Trailing Comma Removal When Joining", async () => {
        const doc = await vscode.workspace.openTextDocument({
            content: "function test(\n    a,\n    b,\n    c,\n) {}",
            language: "typescript"
        });

        const editor = await vscode.window.showTextDocument(doc);

        // Position cursor inside parentheses.
        editor.selection = new vscode.Selection(1, 2, 1, 2);

        await vscode.commands.executeCommand("splitAndJoin.toggle");

        const text = doc.getText();

        assert.ok(!text.includes("c,)"),     "Should not have trailing comma before closing paren");
        assert.ok(text.includes("a, b, c)"), "Should have clean inline arguments");
    });

    test("Skip Strings When Finding Separators", async () => {
        const doc = await vscode.workspace.openTextDocument({
            content: 'func("test, with, commas", other)',
            language: "typescript"
        });

        const editor = await vscode.window.showTextDocument(doc);

        // Position cursor inside parentheses.
        editor.selection = new vscode.Selection(0, 6, 0, 6);

        await vscode.commands.executeCommand("splitAndJoin.toggle");

        const text = doc.getText();
        // Should split on the comma between string and "other", not inside string
        assert.ok(text.includes('"test, with, commas"'), "String should remain intact");
        assert.ok(text.includes("other\n"),              "Should split other argument");

        assert.strictEqual(doc.lineCount, 4, "Should have 4 lines after split");
    });

    test("Nested Delimiters Correctly", async () => {
        const doc = await vscode.workspace.openTextDocument({
            content: "outer(inner(a, b), c)",
            language: "typescript"
        });

        const editor = await vscode.window.showTextDocument(doc);

        // Position cursor in outer function
        editor.selection = new vscode.Selection(0, 19, 0, 19);

        await vscode.commands.executeCommand("splitAndJoin.toggle");

        const text = doc.getText();

        // Should split outer, not inner.
        assert.ok(text.includes("inner(a, b)"), "Inner function should remain on one line");
        assert.ok(text.includes("c\n"),         "Outer c should be split");
    });

    test("Show Message When no Enclosing Delimiter Found", async () => {
        const doc = await vscode.workspace.openTextDocument({
            content: "const x = 5;",
            language: "typescript"
        });

        const editor = await vscode.window.showTextDocument(doc);

        // Position cursor where there"s no delimiter.
        editor.selection = new vscode.Selection(0, 8, 0, 8);

        // This should show "No enclosing delimiter found." message.
        await vscode.commands.executeCommand("splitAndJoin.toggle");

        // Text should remain unchanged
        const text = doc.getText();

        assert.strictEqual(text, "const x = 5;", "Text should be unchanged");
    });

    test("Semicolon Separators", async () => {
        const doc = await vscode.workspace.openTextDocument({
            content: "for (i = 0; i < 10; i++) {}",
            language: "typescript"
        });

        const editor = await vscode.window.showTextDocument(doc);

        // Position cursor inside for loop parentheses.
        editor.selection = new vscode.Selection(0, 10, 0, 10);

        await vscode.commands.executeCommand("splitAndJoin.toggle");

        const text = doc.getText();
        assert.ok(text.includes("i = 0;"),  "Should have i = 0 with semicolon");
        assert.ok(text.includes("i < 10;"), "Should have i < 10 with semicolon");
    });

    test("Cursor on Opening Delimiter", async () => {
        const doc = await vscode.workspace.openTextDocument({
            content: "function test(a, b) {}",
            language: "typescript"
        });

        const editor = await vscode.window.showTextDocument(doc);

        // Position cursor exactly on opening parenthesis
        editor.selection = new vscode.Selection(0, 13, 0, 13);

        await vscode.commands.executeCommand("splitAndJoin.toggle");

        const text = doc.getText();

        assert.ok(text.includes("a,"), "Should split even with cursor on opening delimiter");
    });

    test("Do Not Split When no Separators Exist", async () => {
        const doc = await vscode.workspace.openTextDocument({
            content: "function test(singleArg) {}",
            language: "typescript"
        });

        const editor = await vscode.window.showTextDocument(doc);

        // Position cursor inside parentheses
        editor.selection = new vscode.Selection(0, 15, 0, 15);

        await vscode.commands.executeCommand("splitAndJoin.toggle");

        // Should not split since there are no separators
        const text = doc.getText();

        assert.strictEqual(text, "function test(singleArg) {}", "Should remain unchanged without separators");
    });

    test("Escaped Quotes in Strings", async () => {
        const doc = await vscode.workspace.openTextDocument({
            content: 'func("test\\"quote", other)',
            language: "typescript"
        });
        const editor = await vscode.window.showTextDocument(doc);

        // Position cursor inside parentheses.
        editor.selection = new vscode.Selection(0, 6, 0, 6);

        await vscode.commands.executeCommand("splitAndJoin.toggle");

        const text = doc.getText();

        // Should not break on comma inside string with escaped quote.
        assert.ok(text.includes('"test\\"quote"'), "Escaped quote string should remain intact");
        assert.ok(text.includes("other\n"),        "Should split other argument");
    });
});
