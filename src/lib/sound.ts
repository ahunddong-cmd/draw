// 당첨 팡파르를 오디오 파일 없이 Web Audio API로 직접 합성해서 재생한다.
// 도-미-솔로 상승하는 짧은 트럼펫풍 도입부 뒤에 화음을 길게 울려 "따단!" 하는
// 팡파르 느낌을 낸다. 1등에 가까울수록 마지막 화음이 더 두껍고 풍성해진다.

const NOTE = {
  C5: 523.25,
  E5: 659.25,
  G5: 783.99,
  C6: 1046.5,
  E6: 1318.51,
  G6: 1567.98,
  C7: 2093.0,
};

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

export function playFireworkSound(rank: number): void {
  if (typeof window === "undefined" || !window.AudioContext) return;

  const ctx = new window.AudioContext();

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

  // 도입부: 도-미-솔로 상승하는 3연음
  playNote(ctx, NOTE.C5, start, 0.16, masterGain, voices);
  playNote(ctx, NOTE.E5, start + 0.14, 0.16, masterGain, voices);
  playNote(ctx, NOTE.G5, start + 0.28, 0.16, masterGain, voices);

  // 마무리: 등수에 따라 두께가 달라지는 화음을 길게 울린다 ("따단!")
  const chordStart = start + 0.42;
  const chordDuration = 0.9;
  finaleChordForRank(rank).forEach((freq) => {
    playNote(ctx, freq, chordStart, chordDuration, masterGain, voices);
  });

  const totalDuration = 0.42 + chordDuration + 0.3;
  window.setTimeout(() => ctx.close(), totalDuration * 1000);
}
