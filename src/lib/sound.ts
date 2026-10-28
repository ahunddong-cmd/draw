// 당첨 축하 사운드. 기본은 등수별로 올려둔 사운드 파일(/celebration-rank-N.m4a)을 그대로
// 재생하고, 혹시 그 파일을 못 불러온 경우에만 Web Audio API로 합성한 팡파레로 대신한다
// (행사 현장에서 네트워크 문제 등으로 파일이 안 열려도 무음이 되지 않도록 하는 안전장치).

const NOTE = {
  C5: 523.25,
  E5: 659.25,
  G5: 783.99,
  C6: 1046.5,
  E6: 1318.51,
  G6: 1567.98,
  C7: 2093.0,
};

// 모바일 브라우저는 AudioContext를 매번 새로 만들면 개수 제한에 걸려 소리가
// 안 날 수 있어, 하나를 계속 재사용한다.
let sharedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined" || !window.AudioContext) return null;

  if (!sharedAudioContext) {
    sharedAudioContext = new window.AudioContext();
  }

  if (sharedAudioContext.state === "suspended") {
    // 데스크톱 크롬은 생성 즉시 running 상태가 되지만, iOS Safari 등
    // 일부 모바일 브라우저는 사용자 제스처 안에서도 명시적으로 resume()을
    // 호출해야 실제로 소리가 재생된다.
    void sharedAudioContext.resume();
  }

  return sharedAudioContext;
}

// --- 등수별 사운드 파일 재생 ---

const RANK_SOUND_URL: Record<number, string> = {
  1: "/celebration-rank-1.m4a",
  2: "/celebration-rank-2.m4a",
  3: "/celebration-rank-3.m4a",
  4: "/celebration-rank-4.m4a",
  5: "/celebration-rank-5.m4a",
};

const rankBufferPromises = new Map<number, Promise<AudioBuffer | null>>();

function loadRankBuffer(ctx: AudioContext, rank: number): Promise<AudioBuffer | null> {
  const cached = rankBufferPromises.get(rank);
  if (cached) return cached;

  const url = RANK_SOUND_URL[rank];
  const promise = url
    ? fetch(url)
        .then((res) => res.arrayBuffer())
        .then((buf) => ctx.decodeAudioData(buf))
        .catch(() => null) // 디코딩 실패해도 앱 동작에는 영향 없이 조용히 무시하고, 합성 팡파레로 대체한다.
    : Promise.resolve(null);

  rankBufferPromises.set(rank, promise);
  return promise;
}

// 등수별 사운드 파일을 미리 내려받아 디코딩해둔다. 당첨 순간 지연 없이 재생하기 위해
// 뽑기판에 진입하자마자(사용자 클릭 전) 호출해둔다.
export function preloadCelebrationSounds(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  for (const rank of Object.keys(RANK_SOUND_URL).map(Number)) {
    loadRankBuffer(ctx, rank);
  }
}

function playBuffer(ctx: AudioContext, buffer: AudioBuffer, startTime: number) {
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start(Math.max(ctx.currentTime, startTime));
}

// --- OX 퀴즈 효과음 (카운트다운 / 정답 / 오답) ---
// 등수별 사운드와 달리 합성 대체음은 없다. 파일을 못 불러오면 조용히 무시한다.

const OX_QUIZ_SOUND_URL = {
  countdown: "/ox-quiz-countdown.m4a",
  correct: "/ox-quiz-correct.m4a",
  incorrect: "/ox-quiz-incorrect.m4a",
} as const;

type OxQuizSoundKey = keyof typeof OX_QUIZ_SOUND_URL;

const oxQuizBufferPromises = new Map<OxQuizSoundKey, Promise<AudioBuffer | null>>();

function loadOxQuizBuffer(ctx: AudioContext, key: OxQuizSoundKey): Promise<AudioBuffer | null> {
  const cached = oxQuizBufferPromises.get(key);
  if (cached) return cached;

  const promise = fetch(OX_QUIZ_SOUND_URL[key])
    .then((res) => res.arrayBuffer())
    .then((buf) => ctx.decodeAudioData(buf))
    .catch(() => null);

  oxQuizBufferPromises.set(key, promise);
  return promise;
}

// 효과음을 재생 지연 없이 내보내기 위해 OX 퀴즈 화면 진입 시 미리 불러와둔다.
export function preloadOxQuizSounds(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  (Object.keys(OX_QUIZ_SOUND_URL) as OxQuizSoundKey[]).forEach((key) => loadOxQuizBuffer(ctx, key));
}

export function playOxQuizSound(key: OxQuizSoundKey): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  loadOxQuizBuffer(ctx, key).then((buffer) => {
    if (buffer) playBuffer(ctx, buffer, ctx.currentTime);
  });
}

// --- 합성 팡파레 (등수 사운드 파일을 못 불러왔을 때의 대체용) ---
// 한국 방송에서 흔히 쓰는 "빵빠레" 스타일: 리듬감 있는 금관 강타("빠-빠-라-밤!") +
// 짧은 상승 플로리시 + 길게 울리는 마무리 화음. 1등에 가까울수록 더 풍성해진다.

function playBrass(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  destination: AudioNode,
  voiceCount: number,
  peakVolume: number,
) {
  const detunes =
    voiceCount >= 3 ? [-8, 0, 8] : voiceCount === 2 ? [-6, 6] : [0];

  detunes.forEach((detuneCents) => {
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = freq;
    osc.detune.value = detuneCents;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 3200;

    const peak = peakVolume / detunes.length;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(peak, startTime + 0.015);
    gain.gain.setValueAtTime(peak, startTime + duration * 0.6);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  });
}

function playSparkle(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  destination: AudioNode,
  volume: number,
) {
  const fundamental = ctx.createOscillator();
  fundamental.type = "sine";
  fundamental.frequency.value = freq;

  const overtone = ctx.createOscillator();
  overtone.type = "sine";
  overtone.frequency.value = freq * 2.01;

  const overtoneGain = ctx.createGain();
  overtoneGain.gain.value = 0.3;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  fundamental.connect(gain);
  overtone.connect(overtoneGain);
  overtoneGain.connect(gain);
  gain.connect(destination);

  fundamental.start(startTime);
  fundamental.stop(startTime + duration + 0.05);
  overtone.start(startTime);
  overtone.stop(startTime + duration + 0.05);
}

function playBass(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  destination: AudioNode,
) {
  const osc = ctx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.value = freq;

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 500; // 저음만 통과시켜 두껍고 부드러운 베이스로 만든다

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(0.4, startTime + 0.08);
  gain.gain.setValueAtTime(0.4, startTime + duration * 0.75);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

function voiceCountForRank(rank: number): number {
  return rank <= 2 ? 2 : 1;
}

function finaleChordForRank(rank: number): number[] {
  if (rank <= 1) return [NOTE.C6, NOTE.E6, NOTE.G6, NOTE.C7];
  if (rank === 2) return [NOTE.C6, NOTE.E6, NOTE.G6];
  if (rank === 3) return [NOTE.C6, NOTE.G6];
  return [NOTE.C6];
}

function sparkleCountForRank(rank: number): number {
  return Math.min(4, Math.max(1, 6 - rank));
}

function masterVolumeForRank(rank: number): number {
  if (rank <= 1) return 1.5;
  if (rank === 2) return 1.25;
  if (rank === 3) return 1.1;
  return 1;
}

function playSynthesizedFanfare(ctx: AudioContext, rank: number): void {
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -18;
  compressor.knee.value = 12;
  compressor.ratio.value = 6;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.3;
  compressor.connect(ctx.destination);

  const masterGain = ctx.createGain();
  masterGain.gain.value = masterVolumeForRank(rank);
  masterGain.connect(compressor);

  const start = ctx.currentTime;
  const voices = voiceCountForRank(rank);

  playBrass(ctx, NOTE.C5, start, 0.12, masterGain, voices, 0.6);
  playBrass(ctx, NOTE.C5, start + 0.14, 0.12, masterGain, voices, 0.6);
  playBrass(ctx, NOTE.E5, start + 0.28, 0.12, masterGain, voices, 0.6);
  playBrass(ctx, NOTE.G5, start + 0.42, 0.2, masterGain, voices, 0.65);

  playBrass(ctx, NOTE.G5, start + 0.66, 0.08, masterGain, voices, 0.5);
  playBrass(ctx, NOTE.C6, start + 0.74, 0.1, masterGain, voices, 0.5);

  const finaleStart = start + 0.86;
  const finaleDuration = 0.85;
  finaleChordForRank(rank).forEach((freq) => {
    playBrass(ctx, freq, finaleStart, finaleDuration, masterGain, voices, 0.55);
  });

  playBass(ctx, NOTE.C5 / 2, start, finaleStart + finaleDuration - start, masterGain);

  const sparkleNotes = [NOTE.E6, NOTE.G6, NOTE.C7, NOTE.E6];
  const sparkleCount = sparkleCountForRank(rank);
  for (let i = 0; i < sparkleCount; i += 1) {
    const freq = sparkleNotes[i % sparkleNotes.length];
    playSparkle(ctx, freq, finaleStart + 0.05 + i * 0.09, 0.4, masterGain, 0.2);
  }
}

export function playFireworkSound(rank: number): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  loadRankBuffer(ctx, rank).then((buffer) => {
    if (buffer) {
      playBuffer(ctx, buffer, ctx.currentTime);
    } else {
      playSynthesizedFanfare(ctx, rank);
    }
  });
}
