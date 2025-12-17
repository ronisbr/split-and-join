import * as vscode from "vscode";

/******************************************************************************************
 *                                     Configuration                                      *
 ******************************************************************************************/

/**
 * Defines the structure of the extension's configuration.
 *
 * @property separators Set of all separator characters.
 * @property openToClose Map from opening delimiter to closing delimiter.
 * @property allOpen Set of all opening delimiters.
 * @property allClose Set of all closing delimiters.
 */
interface Config {
    separators: Set<string>;
    openToClose: Map<string, string>;
    allOpen: Set<string>;
    allClose: Set<string>;
}

/**
 * @returns The current configuration for the extension.
 */
function getConfiguration(): Config {
    const config = vscode.workspace.getConfiguration("splitAndJoin");

    // Get list of separators from configuration.
    const separatorsList = config.get<string[]>("separators") || [",", ";"];
    const separators     = new Set(separatorsList);

    // Get list of delimiters from configuration.
    const rawDelimiters = config.get<string[]>("delimiters") || ['()', '[]', '{}'];
    // Map from opening delimiter to closing delimiter.
    const openToClose = new Map<string, string>();
    // Set of all opening delimiters.
    const allOpen = new Set<string>();
    // Set of all closing delimiters.
    const allClose = new Set<string>();

    // Process each delimiter pair.
    for (const pair of rawDelimiters) {
        // All the delimiter pairs must have at least 2 characters. Hence, we skip invalid
        // ones.
        if (pair.length < 2) continue;

        const open  = pair.charAt(0);
        const close = pair.charAt(pair.length - 1);

        openToClose.set(open, close);
        allOpen.add(open);
        allClose.add(close);
    }

    return {separators, openToClose, allOpen, allClose};
}

/******************************************************************************************
 *                                  Auxiliary Functions                                   *
 ******************************************************************************************/

/**
 * Find the range of the nearest enclosing delimiter around the cursor.
 *
 * @param doc Current text document.
 * @param cursor Cursor position.
 * @param config Configuration.
 *
 * @returns Range of the enclosing brackets or null if none found.
 */
function findEnclosingBrackets(
    doc: vscode.TextDocument,
    cursor: vscode.Position,
    config: Config
): vscode.Range | null {
    const text   = doc.getText();
    const offset = doc.offsetAt(cursor);

    type StackItem = { char: string; index: number };
    const stack: StackItem[] = [];
    let enclosing: { openIndex: number; closeIndex: number } | null = null;

    let inString: string | null = null;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];

        if (inString) {
            if (char === inString) {
                // Count consecutive backslashes before the quote.
                let backslashCount = 0;

                for (let j = i - 1; j >= 0 && text[j] === '\\'; j--) {
                    backslashCount++;
                }

                // Quote is escaped if odd number of backslashes.
                if (backslashCount % 2 === 0) {
                    inString = null;
                }
            }
            continue;
        }

        // Enter string.
        if (char === '"' || char === "'" || char === '`') {
            inString = char;
            continue;
        }

        if (config.allOpen.has(char)) {
            stack.push({ char, index: i });
        } else if (config.allClose.has(char)) {
            const top = stack[stack.length - 1];

            if (top && config.openToClose.get(top.char) === char) {
                const open = stack.pop()!;

                if (open.index <= offset && offset <= i) {
                    if (!enclosing || open.index > enclosing.openIndex) {
                        enclosing = { openIndex: open.index, closeIndex: i };
                    }
                }
            }
        }
    }

    if (!enclosing) return null;

    return new vscode.Range(
        doc.positionAt(enclosing.openIndex),
        doc.positionAt(enclosing.closeIndex + 1)
    );
}

/**
 * Scans the content and returns ALL indices where ANY of the configured
 * separators occur at the top level.
 */
function findSeparators(text: string, config: Config): { index: number; char: string }[] {
    const results: { index: number; char: string }[] = [];
    const stack: string[] = [];
    let inString: string | null = null;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];

        // String Skipping.
        if (inString) {
            if (char === inString) {
                // Count consecutive backslashes before the quote.
                let backslashCount = 0;

                for (let j = i - 1; j >= 0 && text[j] === '\\'; j--) {
                    backslashCount++;
                }

                // Quote is escaped if odd number of backslashes.
                if (backslashCount % 2 === 0) {
                    inString = null;
                }
            }
            continue;
        }

        if (char === '"' || char === "'" || char === '`') {
            inString = char;
            continue;
        }

        // Delimiters balancing.
        if (config.allOpen.has(char)) {
            stack.push(char);
        } else if (config.allClose.has(char)) {
            const lastOpen = stack[stack.length - 1];

            if (lastOpen && config.openToClose.get(lastOpen) === char) {
                stack.pop();
            }
        }

        // Separator Detection (Union Check).
        // Check if current char is in the set of configured separators.
        if (stack.length === 0 && config.separators.has(char)) {
            results.push({ index: i, char });
        }
    }

    return results;
}

/**
 * Unwraps the given text by extracting the opening and closing characters.
 * 
 * @param text Text to unwrap.
 * @returns Object containing opening char, closing char, and inner content.
 */
function unwrapBrackets(text: string) {
    const open    = text.charAt(0);
    const close   = text.charAt(text.length - 1);
    const content = text.substring(1, text.length - 1);

    return { open, close, content };
}

/******************************************************************************************
 *                                      Main Logic                                        *
 ******************************************************************************************/

/**
 * Join content within the specified range by removing newlines and extra spaces.
 * 
 * @param editBuilder Object to apply text edits.
 * @param range Range of text to replace.
 * @param text Current text within the range.
 * @param config Configuration object.
 */
function joinContent(
    editBuilder: vscode.TextEditorEdit,
    range: vscode.Range,
    text: string,
    config: Config
) {
    const { open, close, content } = unwrapBrackets(text);

    // Collapse newlines into spaces and trim whitespace.
    let joined = content.replace(/\s*\n\s*/g, ' ').trim();

    // Remove any trailing delimiter defined in configuration.
    if (joined.length > 0) {
        const lastChar = joined.charAt(joined.length - 1);

        // Check if the last character is one of our valid separators.
        if (config.separators.has(lastChar)) {
            // If so, remove the trailing separator and trim again.
            joined = joined.substring(0, joined.length - 1).trim();
        }
    }

    const newText = `${open}${joined}${close}`;
    editBuilder.replace(range, newText);
}

/**
 * Split content within the specified range by inserting newlines after separators.
 * 
 * @param editBuilder Object to apply text edits.
 * @param editor Current text editor.
 * @param range Range of text to replace.
 * @param text Current text within the range.
 * @param config Configuration object.
 */
function splitContent(
    editBuilder: vscode.TextEditorEdit,
    editor: vscode.TextEditor,
    range: vscode.Range,
    text: string,
    config: Config
) {
    const { open, close, content } = unwrapBrackets(text);

    // Find all occurrences of any configured separator.
    const separatorOccurrences = findSeparators(content, config);

    // If no separators found, don't split (even if content exists)
    if (separatorOccurrences.length === 0) return;

    // Obtain the current indentation setup.
    const options      = editor.options;
    const tabSize      = (typeof options.tabSize      === "number")  ? options.tabSize      : 4;
    const insertSpaces = (typeof options.insertSpaces === "boolean") ? options.insertSpaces : true;
    const indentUnit   = insertSpaces ? ' '.repeat(tabSize) : '\t';

    const baseLine    = editor.document.lineAt(range.start.line);
    const baseIndent  = baseLine.text.substring(0, baseLine.firstNonWhitespaceCharacterIndex);
    const childIndent = baseIndent + indentUnit;

    let newText   = open + '\n';
    let lastIndex = 0;

    // Process all found separators.
    for (const { index, char } of separatorOccurrences) {
        const item = content.substring(lastIndex, index).trim();

        // Add the item followed by the separator that was actually found in the text.
        newText += childIndent + item + char + '\n';

        lastIndex = index + 1;
    }

    // Handle the remaining text after the last separator
    const lastItem = content.substring(lastIndex).trim();

    if (lastItem.length > 0) {
        // Do not force a trailing separator here at the end.
        newText += childIndent + lastItem + '\n';
    }

    newText += baseIndent + close;
    editBuilder.replace(range, newText);
}

/**
 * Toggles between splitting and joining content within the nearest enclosing delimiter.
 * @param editor Current text editor.
 */
function toggleSplitJoin(editor: vscode.TextEditor): Thenable<boolean> | undefined {
    const doc    = editor.document;
    const cursor = editor.selection.active;
    const config = getConfiguration();

    const range = findEnclosingBrackets(doc, cursor, config);

    if (!range) {
        vscode.window.showInformationMessage("No enclosing delimiter found.");
        return Promise.resolve(false);
    }

    const text        = doc.getText(range);
    const isMultiLine = range.start.line !== range.end.line;

    return editor.edit(
        editBuilder => {
            if (isMultiLine) {
                joinContent(editBuilder, range, text, config);
            } else {
                splitContent(editBuilder, editor, range, text, config);
            }
        }
    );
}

/******************************************************************************************
 *                                 Visual Studio Code API                                 *
 ******************************************************************************************/

export function activate(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand("splitAndJoin.toggle", () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;
        return toggleSplitJoin(editor);
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}