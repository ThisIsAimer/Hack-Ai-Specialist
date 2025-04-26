export {};

declare global {
  interface Window {
    TalkingHead: new (
      modelUrl: string,
      container: HTMLElement,
      options?: {
        ttsEndpoint?: string;
        ttsApikey?: string;
        ttsVoice?: string;
        ttsMarks?: boolean;
        [key: string]: any;
      }
    ) => {
      speak: (text: string) => Promise<void>;
    };
  }
}