export default function StaffManual() {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-orange-500/20 bg-[#1f140a]/60 p-5">
      <h2 className="text-lg font-semibold text-white">📋 운영 스탭 사용 매뉴얼</h2>

      <div className="flex flex-col gap-2">
        <h3 className="font-semibold text-orange-300">1. 행사 전 준비 (설정 화면)</h3>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-300">
          <li>필요하면 화면 위쪽부터 순서대로 행사 문구, 참여 안내 문구, QR 코드를 입력합니다. (모두 선택사항이며 비워둬도 됩니다)</li>
          <li>참여자 수를 실제 예상 인원에 맞게 설정합니다. (50명 ~ 500명)</li>
          <li>등수별 당첨 비율과 지급할 굿즈 이름을 입력합니다. 비율 합계는 100%를 넘을 수 없습니다.</li>
          <li>화면 아래 「미리보기」에서 실제 뽑기판에 어떻게 보일지 확인합니다.</li>
        </ol>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="font-semibold text-orange-300">2. 뽑기 시작</h3>
        <p className="text-sm text-slate-300">
          설정을 마쳤으면 「뽑기 시작하기」 버튼을 누릅니다. 버튼을 누르는 순간 참여자 수만큼 뽑기판이 무작위로 섞여 만들어지며, 이후 참여자에게 화면을 넘겨주면 됩니다.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="font-semibold text-orange-300">3. 참여자 안내</h3>
        <p className="text-sm text-slate-300">
          참여자가 뽑기판의 빈 칸(물음표)을 터치하면 그 자리에서 바로 결과(등수 또는 꽝)가 화면 중앙에 크게 표시됩니다. 한 번 뽑은 칸은 다시 뽑을 수 없으며, 모든 칸을 다 뽑으면 화면에 완료 안내가 표시됩니다.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="font-semibold text-orange-300">4. 처음부터 다시 시작하기</h3>
        <p className="text-sm text-slate-300">
          화면 우측 상단 「처음부터 다시」 버튼을 누르면 비밀번호(PIN) 입력창이 뜹니다. 참여자가 실수로 누르지 못하도록 하는 안전장치이니, 운영 스탭만 비밀번호를 입력해 설정 화면으로 돌아가세요. (기본 비밀번호: 1234)
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="font-semibold text-orange-300">5. 주의사항</h3>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">
          <li>뽑기가 진행되는 중에는 브라우저를 새로고침하거나 다른 기기·다른 탭에서 열지 마세요. 진행 상황이 이 화면(브라우저)에만 저장되어, 새로고침하면 뽑기판이 초기화됩니다.</li>
          <li>행사 문구·참여 안내 문구는 이 기기(브라우저)에 마지막으로 입력한 내용이 자동으로 저장되어 다음에 열 때도 유지됩니다. 단, QR 코드 이미지는 저장되지 않으므로 새로고침하거나 다시 접속할 때마다 다시 업로드해야 합니다.</li>
          <li>인터넷 연결이 필요합니다. 화면이 안 열리면 먼저 네트워크 연결 상태를 확인해주세요.</li>
        </ul>
      </div>
    </section>
  );
}
