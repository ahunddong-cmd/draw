// 당첨 축하 사운드를 오디오 파일 없이 Web Audio API로 직접 합성해서 재생한다.
// 도-미-솔로 상승하는 트럼펫풍 도입부 + 화음 마무리(브라스) + 반짝이는 스파클 +
// 도입부부터 끝까지 깔리는 베이스음을 겹쳐서 "진짜 축하받는" 느낌을 낸다.
// 1등에 가까울수록 화음과 스파클이 더 풍성해진다.

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

// 하나의 음을 트럼펫처럼 들리도록 새소리(sawtooth) 오실레이터로 재생한다.
// voiceCount가 2 이상이면 살짝 음을 어긋나게(디튠) 겹쳐서 여러 명이 함께 부는
// 금관악기 합주처럼 두껍게 만든다.
function playNote(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  destination: AudioNode,
  voiceCount: number,
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

    const peak = 0.55 / detunes.length;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(peak, startTime + 0.02);
    gain.gain.setValueAtTime(peak, startTime + duration * 0.6);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  });
}

// 종/벨 소리 느낌의 반짝이는 스파클 음
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

// 1등에 가까울수록 마무리 화음에 음을 더 쌓아 풍성하게 들리도록 한다.
function finaleChordForRank(rank: number): number[] {
  if (rank <= 1) return [NOTE.C6, NOTE.E6, NOTE.G6, NOTE.C7];
  if (rank === 2) return [NOTE.C6, NOTE.E6, NOTE.G6];
  if (rank === 3) return [NOTE.C6, NOTE.G6];
  return [NOTE.C6];
}

function voiceCountForRank(rank: number): number {
  return rank <= 2 ? 2 : 1;
}

// 1등에 가까울수록 반짝이는 스파클 음을 더 많이 흩뿌린다.
function sparkleCountForRank(rank: number): number {
  return Math.min(5, Math.max(2, 7 - rank));
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
  masterGain.gain.value = 1;
  masterGain.connect(compressor);

  const start = ctx.currentTime;
  const voices = voiceCountForRank(rank);
  const chordStart = start + 0.42;
  const chordDuration = 0.9;

  // 도입부부터 마무리까지 전체를 받쳐주는 베이스음(으뜸음 페달톤)
  playBass(ctx, NOTE.C5 / 2, start, chordStart + chordDuration - start, masterGain);

  // 도입부: 도-미-솔로 상승하는 3연음
  playNote(ctx, NOTE.C5, start, 0.16, masterGain, voices);
  playNote(ctx, NOTE.E5, start + 0.14, 0.16, masterGain, voices);
  playNote(ctx, NOTE.G5, start + 0.28, 0.16, masterGain, voices);

  // 마무리: 화음(브라스)을 길게 울린다 ("따단!")
  finaleChordForRank(rank).forEach((freq) => {
    playNote(ctx, freq, chordStart, chordDuration, masterGain, voices);
  });

  // 화음 위로 반짝이는 스파클을 흩뿌려 축하하는 느낌을 더한다.
  const sparkleNotes = [NOTE.E6, NOTE.G6, NOTE.C7, NOTE.E6, NOTE.G6];
  const sparkleCount = sparkleCountForRank(rank);
  for (let i = 0; i < sparkleCount; i += 1) {
    const freq = sparkleNotes[i % sparkleNotes.length];
    playSparkle(ctx, freq, chordStart + 0.05 + i * 0.08, 0.4, masterGain, 0.22);
  }
}
