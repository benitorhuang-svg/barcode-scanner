import type { AudioFeedbackPort } from '@/application/scanning/ports/AudioFeedbackPort';
import { playBeep } from './play-beep';

/**
 * Adapter encapsulating audio feedback (the beep sound).
 * In Hexagonal Architecture, this handles side-effects to the audio interface.
 */
export class AudioAdapter implements AudioFeedbackPort {
  playSuccessSound(): void {
    playBeep();
  }
}
