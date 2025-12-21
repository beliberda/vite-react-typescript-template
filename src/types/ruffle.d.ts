declare module "@ruffle-rs/ruffle" {
  export interface RufflePlayer extends HTMLElement {
    load(options: { url: string; parameters?: string }): Promise<void>;
    remove(): void;
  }

  export class SourceAPI {
    static negotiateAndCreate(): RufflePlayer;
  }
}
