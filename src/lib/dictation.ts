/**
 * Why the microphone button did nothing (22 Nov): the browser's error was thrown away and the
 * button just reset, so staff said "not working". Each reason is said plainly next to it.
 */
export function dictationProblem(error: string): string {
  switch (error) {
    case "not-allowed":
    case "service-not-allowed":
      return "The microphone is blocked for this site - allow it in the browser's address bar, then press again.";
    case "no-speech":
      return "Nothing was heard. Press and speak a little louder.";
    case "audio-capture":
      return "No microphone was found. Plug one in or choose one in the browser.";
    case "network":
      return "Speech recognition needs the internet and could not reach it. Type it instead.";
    case "aborted":
      return "";
    default:
      return "Listening stopped (" + error + "). Press again, or type it instead.";
  }
}
