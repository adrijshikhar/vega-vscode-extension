import * as path from 'path';
import * as vscode from 'vscode';
import * as vega from 'vega';

import { getHtmlForWebview } from './utils';


export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('vegaPanel.compile', async () => {
      await VegaPanel.createOrShow(context.extensionPath);
    })
  );


  if (vscode.window.registerWebviewPanelSerializer) {
    // Make sure we register a serializer in activation event
    vscode.window.registerWebviewPanelSerializer(VegaPanel.viewType, {
      async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {
        console.log(`Got state: ${state}`);
        VegaPanel.revive(webviewPanel, context.extensionPath);
      }
    });
  }
}

class VegaPanel {
	/**
	 * Track the currently panel. Only allow a single panel to exist at a time.
	 */
  public static currentPanel: VegaPanel | undefined;

  public static readonly viewType = 'vegaPanel';

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionPath: string;
  private _disposables: vscode.Disposable[] = [];

  private static async parseVega() {
    let parsedHTML = '';
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      const document = editor.document;

      // Get the word within the selection
      try {
        const docJson = JSON.parse(document.getText());

        const vegaView = vega.parse(docJson, {
          "background": "#333",
          "title": { "color": "#fff" },
          "style": { "guide-label": { "fill": "#fff" }, "guide-title": { "fill": "#fff" } },
          "axis": { "domainColor": "#fff", "gridColor": "#888", "tickColor": "#fff" }
        });

        const view = new vega.View(vegaView, {
          renderer: 'none' // no primary renderer needed
        }).finalize();
        const parsedSVG = await view.toSVG();
        parsedHTML = getHtmlForWebview(parsedSVG);
      } catch (error) {
        console.log(error);
      }
    }
    return parsedHTML;
  }

  public static async createOrShow(extensionPath: string) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If we already have a panel, show it.
    if (VegaPanel.currentPanel) {
      VegaPanel.currentPanel._panel.reveal(column);
      return;
    }

    // Otherwise, create a new panel.
    const panel = vscode.window.createWebviewPanel(
      VegaPanel.viewType,
      'Vega Panel',
      column || vscode.ViewColumn.One,
      {
        // Enable javascript in the webview
        enableScripts: true,

        // And restrict the webview to only loading content from our extension's `media` directory.
        localResourceRoots: [vscode.Uri.file(path.join(extensionPath, 'media'))]
      }
    );

    panel.webview.html = await this.parseVega();
    VegaPanel.currentPanel = new VegaPanel(panel, extensionPath);
  }

  public static revive(panel: vscode.WebviewPanel, extensionPath: string) {
    VegaPanel.currentPanel = new VegaPanel(panel, extensionPath);
  }

  private constructor(panel: vscode.WebviewPanel, extensionPath: string) {
    this._panel = panel;
    this._extensionPath = extensionPath;

    // Set the webview's initial html content
    this._update().then(response => console.log(response));

    // Listen for when the panel is disposed
    // This happens when the user closes the panel or when the panel is closed programatically
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Update the content based on view changes
    this._panel.onDidChangeViewState(
      e => {
        if (this._panel.visible) {
          this._update().then(res => res);
        }
      },
      null,
      this._disposables
    );

    // Handle messages from the webview
    this._panel.webview.onDidReceiveMessage(
      message => {
        switch (message.command) {
          case 'alert':
            vscode.window.showErrorMessage(message.text);
            return;
        }
      },
      null,
      this._disposables
    );
  }


  public dispose() {
    VegaPanel.currentPanel = undefined;

    // Clean up our resources
    this._panel.dispose();

    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  private async _update() {
    this._panel.webview.html = await VegaPanel.parseVega();
  }

}
