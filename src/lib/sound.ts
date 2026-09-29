// 당첨 축하 사운드를 오디오 파일 없이 Web Audio API로 직접 합성해서 재생한다.
// 한국 방송에서 흔히 쓰는 "빵빠레" 스타일: 리듬감 있는 금관 강타("빠-빠-라-밤!") +
// 짧은 상승 플로리시 + 길게 울리는 마무리 화음. 도입부부터 끝까지 베이스음을 깔고
// 화음 위에는 반짝이는 스파클을 살짝 얹는다.
// 1등에 가까울수록 금관이 더 두껍고(여러 명이 합주하는 느낌) 마무리 화음도 풍성해진다.

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

// 금관악기(브라스) 느낌의 새소리(sawtooth) 오실레이터로 한 음을 재생한다.
// voiceCount가 2 이상이면 살짝 음을 어긋나게(디튠) 겹쳐서 여러 명이 함께 부는
// 금관악기 합주처럼 두껍게 만든다.
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

// 마무리 화음 위에 얹는 반짝이는 벨 스파클
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

// 도입부부터 마무리 화음까지 전체를 받쳐주는 베이스음(화성의 뿌리음)
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

// --- 1등 전용: 사용자가 올린 박수 사운드를 여러 겹으로 겹쳐 재생하고, 관중 함성 느낌의
// 합성 사운드를 더해 "여러 사람이 함께 박수치고 환호하는" 느낌을 낸다. ---

let clapBufferPromise: Promise<AudioBuffer | null> | null = null;

// 박수 사운드 파일을 미리 내려받아 디코딩해둔다. 1등이 나온 순간 지연 없이 재생하기 위해
// 뽑기판에 진입하자마자(사용자 클릭 전) 호출해둔다.
export function preloadCelebrationClap(): void {
  const ctx = getAudioContext();
  if (!ctx || clapBufferPromise) return;

  clapBufferPromise = fetch("/celebration-clap.m4a")
    .then((res) => res.arrayBuffer())
    .then((buf) => ctx.decodeAudioData(buf))
    .catch(() => null); // 디코딩 실패해도 앱 동작에는 영향 없이 조용히 무시한다.
}

const CLAP_LAYER_COUNT = 7; // 여러 사람이 동시에 박수치는 느낌을 내기 위해 겹쳐 재생하는 횟수
const CLAP_LAYER_SPREAD_SEC = 0.22; // 레이어마다 시작 시점을 살짝씩 어긋나게 흩뿌리는 범위

// 같은 박수 녹음을 여러 번, 사람마다 손 크기·타이밍이 다른 것처럼 속도와 시작 시점을
// 살짝씩 어긋나게 겹쳐 재생해 '여러 명의 박수'처럼 두껍게 만든다.
function playClapLayers(
  ctx: AudioContext,
  buffer: AudioBuffer,
  startTime: number,
  destination: AudioNode,
) {
  for (let i = 0; i < CLAP_LAYER_COUNT; i += 1) {
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = 0.88 + Math.random() * 0.24;

    const gain = ctx.createGain();
    gain.gain.value = 0.5 + Math.random() * 0.3;

    source.connect(gain);
    gain.connect(destination);

    const offset = Math.random() * CLAP_LAYER_SPREAD_SEC;
    source.start(startTime + offset);
  }
}

// 실제 관중 함성 녹음은 없어서, 대역 필터를 통과시킨 노이즈로 '와아~' 하는
// 관중 함성의 질감을 합성해 흉내 낸다.
function playCrowdCheerSwell(
  ctx: AudioContext,
  startTime: number,
  duration: number,
  destination: AudioNode,
) {
  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;

  const bandpass = ctx.createBiquadFilter();
  bandpass.type = "bandpass";
  bandpass.frequency.value = 1100; // 사람 목소리가 뭉쳐 들리는 대역
  bandpass.Q.value = 0.7;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(0.35, startTime + duration * 0.3);
  gain.gain.setValueAtTime(0.35, startTime + duration * 0.7);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  noise.connect(bandpass);
  bandpass.connect(gain);
  gain.connect(destination);
  noise.start(startTime);
  noise.stop(startTime + duration + 0.05);
}

// 1등 당첨 시에만 기존 팡파레 위에 박수 여러 겹 + 함성 스웰을 얹는다.
function playFirstPlaceCelebration(ctx: AudioContext, startTime: number, destination: AudioNode) {
  playCrowdCheerSwell(ctx, startTime, 1.6, destination);

  if (!clapBufferPromise) preloadCelebrationClap();
  clapBufferPromise?.then((buffer) => {
    if (!buffer) return;
    // 디코딩이 비동기로 늦게 끝나 startTime이 이미 지났을 수 있어 현재 시각으로 보정한다.
    const actualStart = Math.max(ctx.currentTime, startTime);
    playClapLayers(ctx, buffer, actualStart, destination);
  });
}

function voiceCountForRank(rank: number): number {
  return rank <= 2 ? 2 : 1;
}

// 1등에 가까울수록 마무리 화음에 음을 더 쌓아 풍성하게 들리도록 한다.
function finaleChordForRank(rank: number): number[] {
  if (rank <= 1) return [NOTE.C6, NOTE.E6, NOTE.G6, NOTE.C7];
  if (rank === 2) return [NOTE.C6, NOTE.E6, NOTE.G6];
  if (rank === 3) return [NOTE.C6, NOTE.G6];
  return [NOTE.C6];
}

// 1등에 가까울수록 반짝이는 스파클 음을 더 많이 흩뿌린다.
function sparkleCountForRank(rank: number): number {
  return Math.min(4, Math.max(1, 6 - rank));
}

// 1등에 가까울수록 전체 사운드 자체를 더 크게 재생한다.
function masterVolumeForRank(rank: number): number {
  if (rank <= 1) return 1.5;
  if (rank === 2) return 1.25;
  if (rank === 3) return 1.1;
  return 1;
}

export function playFireworkSound(rank: number): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  // 여러 음이 겹쳐도 소리가 찢어지지 않도록 마스터 버스에 컴프레서를 건다.
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

  // "빠-빠-라-밤!" 리듬의 짧은 금관 강타 (같은 음 두 번 반복하는 전형적인 빵빠레 콜)
  playBrass(ctx, NOTE.C5, start, 0.12, masterGain, voices, 0.6);
  playBrass(ctx, NOTE.C5, start + 0.14, 0.12, masterGain, voices, 0.6);
  playBrass(ctx, NOTE.E5, start + 0.28, 0.12, masterGain, voices, 0.6);
  playBrass(ctx, NOTE.G5, start + 0.42, 0.2, masterGain, voices, 0.65);

  // 짧은 상승 플로리시로 마무리 화음을 향해 치고 올라간다
  playBrass(ctx, NOTE.G5, start + 0.66, 0.08, masterGain, voices, 0.5);
  playBrass(ctx, NOTE.C6, start + 0.74, 0.1, masterGain, voices, 0.5);

  // 마무리: 화음(브라스)을 길게 울린다 ("따란~!")
  const finaleStart = start + 0.86;
  const finaleDuration = 0.85;
  finaleChordForRank(rank).forEach((freq) => {
    playBrass(ctx, freq, finaleStart, finaleDuration, masterGain, voices, 0.55);
  });

  // 베이스: 도입부부터 마무리까지 전체를 받쳐준다
  playBass(ctx, NOTE.C5 / 2, start, finaleStart + finaleDuration - start, masterGain);

  // 화음 위로 반짝이는 스파클을 살짝 흩뿌려 화려함을 더한다.
  const sparkleNotes = [NOTE.E6, NOTE.G6, NOTE.C7, NOTE.E6];
  const sparkleCount = sparkleCountForRank(rank);
  for (let i = 0; i < sparkleCount; i += 1) {
    const freq = sparkleNotes[i % sparkleNotes.length];
    playSparkle(ctx, freq, finaleStart + 0.05 + i * 0.09, 0.4, masterGain, 0.2);
  }

  // 1등에만 마무리 화음 타이밍에 맞춰 여러 명이 박수·환호하는 사운드를 더한다.
  if (rank === 1) {
    playFirstPlaceCelebration(ctx, finaleStart, masterGain);
  }
}
