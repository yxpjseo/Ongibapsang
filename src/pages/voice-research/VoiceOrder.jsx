import React, { useEffect, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";

  /* 상태별 UI 문구 / 버튼 라벨 / 버튼 색상 클래스 */
  const EmOrange = styled.span` color: var(--main-color); `;
  const EmGray   = styled.span` color: #B2B2B2; `;
  const EmMedium = styled.span` font-weight: 500; `;
  
/**
 * VoiceOrder
 * - 페이지 진입 시 자동으로 "듣기(listening)" 시작
 * - 화면에는 버튼 1개만 존재
 * - 같은 버튼을 누르면: 듣기 종료 → 인식 텍스트 확정 → 즉시 검색 호출
 *   - 결과 있음: 결과 페이지로 이동
 *   - 결과 없음: "검색결과 없음" 문구 표시
 *   - 인식 실패: "인식되지 않음" 문구 표시
 * - 다시 버튼을 누르면 "다시 시도"로 listening 재시작
 */
const VoiceOrder = () => {
  // 브라우저가 지원하는 Web Speech Recognition 객체 얻기
  // (Chrome: window.SpeechRecognition 또는 window.webkitSpeechRecognition)
  const SR =
    typeof window !== "undefined"
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null;

  /**
   * phase: 화면 단계 (UI 문구/버튼 라벨을 결정하는 스위치)
   *  - "listening": 듣는 중(페이지 진입 직후 또는 다시 시도 직후)
   *  - "processing": 인식 성공 → 검색 중(결과 기다리는 상태)
   *  - "noVoice": 인식 실패(텍스트가 비었거나 오류)
   *  - "noResult": 검색 결과 없음
   */
  const [phase, setPhase] = useState("listening");

  /**
   * displayText: 화면에 즉시 보여줄 텍스트 (interim 또는 final)
   * - onresult 이벤트에서 중간/최종 결과를 취합해서 화면에 보여주는 용도
   * - 실제 검색은 recognizedText를 사용(확정 텍스트)
   */
  const [displayText, setDisplayText] = useState("");

  /**
   * recognizedText: 최종 확정된 텍스트 (검색에 사용)
   * - 듣기 종료 후, finalRef와 displayText를 조합해 확정
   * - UI 상단 문구에도 이 값을 보여줌(phase=processing)
   */
  const [recognizedText, setRecognizedText] = useState("");

  /**
   * loading: 검색 호출 중인지 여부 (로딩 문구/버튼 비활성 등에 사용)
   */
  const [loading, setLoading] = useState(false);

  /**
   * recogRef: Web Speech Recognition 인스턴스를 보관
   * - ref를 쓰는 이유: 상태 변경 없이도 객체를 유지/접근하려고 (렌더 유발 X)
   */
  const recogRef = useRef(null);

  /**
   * stopperRef: 듣기 시간 제한(예: 6초) 타이머 ID를 보관
   * - 듣기 시작될 때 타이머를 새로 건 뒤,
   *   시간이 지나면 자동으로 recognition.stop() 호출
   */
  const stopperRef = useRef(null);

  /**
   * finalRef: 최종 인식 텍스트 누적용 버퍼
   * - onresult 이벤트에서 evt.results[i].isFinal === true 인 경우
   *   해당 chunk를 finalRef.current에 계속 이어 붙임
   * - ref를 쓰는 이유: 누적 과정에서 렌더(리렌더) 유발 방지
   */
  const finalRef = useRef("");

  // (선택) 백엔드 엔드포인트를 전역 변수로 주입해두었다면 우선 사용, 없으면 기본값 사용
  const SEARCH_API = (typeof window !== "undefined" && window.__SEARCH_API__) || "/restaurants/api/search";
  const RESULTS_URL = (typeof window !== "undefined" && window.__RESULTS_URL__) || "/restaurants/results/";

  /**
   * 마운트시 1회 실행:
   * - 브라우저가 SR을 지원하면 Recognition 인스턴스를 만들고 이벤트 핸들러 연결
   * - 페이지 진입과 동시에 "듣기 시작"
   * - 언마운트 시 타이머/이벤트 정리
   */

  useEffect(() => {
    // SR 미지원 브라우저(예: 일부 iOS Safari)에서는 그냥 종료
    if (!SR) return;

    // 1) Recognition 인스턴스 생성 및 옵션 설정
    const r = new SR();
    r.lang = "ko-KR";            // 한국어 인식
    r.interimResults = true;     // 중간결과(interim)도 받겠다
    r.continuous = false;        // 한 번 듣고 끝 (연속 듣기는 false)
    r.maxAlternatives = 1;       // 대안 1개만

    // 2) 이벤트 핸들러 등록
    r.onstart = () => {
      // 듣기 시작 시점: 최종 텍스트 버퍼 비우고, 화면에는 "인식 중…" 표시
      finalRef.current = "";
      setDisplayText("인식 중…");

      // 이전에 걸린 타이머가 있으면 정리하고 새로 건다 (예: 6초 제한)
      clearTimeout(stopperRef.current);
      stopperRef.current = setTimeout(() => r.stop(), 6000); // 6000ms = 6초
    };

    r.onresult = (evt) => {
      // onresult는 말할 때마다 여러 번 호출됨
      // evt.results에는 이번 resultIndex부터 마지막까지의 인식 결과가 들어있음
      let interim = "";

      // resultIndex부터 반복하여 이번 이벤트에서 들어온 결과를 모두 처리
      for (let i = evt.resultIndex; i < evt.results.length; i++) {
        const phrase = evt.results[i][0].transcript; // 인식된 조각 텍스트
        if (evt.results[i].isFinal) {
          // 최종 확정 텍스트면 버퍼(finalRef)에 누적
          finalRef.current += phrase;
        } else {
          // 아직 확정 전인 interim 텍스트는 별도 변수에 모아서 화면에 임시로 표시
          interim += phrase;
        }
      }

      // 화면 표시용 텍스트 선택:
      // - finalRef가 있으면 그걸 최우선
      // - 없으면 interim(중간) 텍스트
      // - 둘 다 없으면 "인식 실패" 표시
      const shown = (finalRef.current || interim).trim();
      setDisplayText(shown || "인식 실패");
    };

    r.onerror = (e) => {
      // 인식 중 오류(마이크 거부, 네트워크 등)가 나면 실패 상태로 전환
      console.error("SpeechRecognition error:", e);
      setPhase("noVoice");
      setDisplayText("인식되지 않음");
    };

    r.onend = () => {
      // 인식이 끝났을 때(정상 종료든 비정상 종료든) 타이머 제거
      clearTimeout(stopperRef.current);
    };

    // 3) ref에 인스턴스를 보관 (버튼 핸들러에서 start/stop 호출용)
    recogRef.current = r;

    // 4) 페이지 들어오자마자 듣기를 자동 시작
    startListening();

    // 5) 언마운트 시 정리: 타이머/인식 중지
    return () => {
      clearTimeout(stopperRef.current);
      try {
        r.stop();
      } catch {
        /* 이미 정지 상태일 수도 있으니 무시 */
      }
    };
    // SR(생성자)가 바뀌지 않는 한 1회 실행
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [SR]);

  /**
   * startListening
   * - phase를 "listening"으로 바꾸고
   * - 확정 텍스트를 초기화한 뒤
   * - SpeechRecognition.start()로 인식 시작
   */
  const startListening = () => {
    if (!SR) {
      alert("이 브라우저는 음성 인식을 지원하지 않습니다. (Chrome 권장)");
      return;
    }
    setPhase("listening");
    setRecognizedText("");
    setDisplayText("인식 중…");
    recogRef.current?.start();
  };

  /**
   * stopListeningAndSearch
   * - 인식을 중지한 뒤, 최종 텍스트를 확정(captured)
   * - 텍스트가 없으면 noVoice(인식 실패)
   * - 텍스트가 있으면 화면에 표시하고 즉시 백엔드 검색 API 호출
   *   - 결과 있으면: 결과 페이지로 이동
   *   - 결과 없으면: noResult(검색결과 없음)
   *   - 네트워크 오류 등: 일단 noResult처럼 처리(원하면 별도 상태로 분리 가능)
   */
  // 플레이스홀더/실패 문구 필터
  const isInvalidRecognized = (t) => {
    if (!t) return true;
    const s = String(t).replace(/\s+/g, "").replace(/\u2026/g, "...").toLowerCase();
    return (
      !s ||
      s.includes("인식중") ||
      s.includes("인식실패") ||
      s.includes("인식되지않음") ||
      s.includes("listening") ||
      s.includes("recognizing")
    );
  };

  const stopListeningAndSearch = async () => {
    // 1) 듣기 중지
    recogRef.current?.stop();

    // 2) 최종 텍스트 확정
    // - finalRef.current: onresult에서 확정된 텍스트 누적 버퍼
    // - displayText: interim 포함 화면 표시 텍스트 (final 없으면 대체)
    const captured = (finalRef.current || displayText || "").trim();

    // 3) 인식 실패 처리
    if (isInvalidRecognized(captured)) {
      setPhase("noVoice");
      setRecognizedText("");
      return;
    }

    // 4) 인식 성공: 확정 텍스트를 저장하고 "processing(검색 중)" 상태로 전환
    setRecognizedText(captured);
    setPhase("processing");
    setLoading(true);

    try {
      // (선택) 세션 인증을 쓰는 DRF라면 CSRF 토큰 필요
      const getCookie = (name) => {
        const m = document.cookie.match("(^|;)\\s*" + name + "\\s*=\\s*([^;]+)");
        return m ? m.pop() : "";
      };

      // 5) 백엔드 검색 API 호출
      //    - SEARCH_API: 전역(window.__SEARCH_API__) 있으면 우선 사용, 없으면 기본값
      const res = await fetch(SEARCH_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-CSRFToken": getCookie("csrftoken"),
        },
        body: JSON.stringify({ text: captured, limit: 10 }),
      });

      if (!res.ok) throw new Error("HTTP " + res.status);

      // 6) 응답 파싱: { cards: [...] } 형태 가정
      const data = await res.json();
      const list = data?.cards ?? [];

      // 7) 결과 분기
      if (list.length > 0) {
        // 결과가 있으면 결과 페이지로 이동
        // - RESULTS_URL: window.__RESULTS_URL__ 있으면 우선 사용
        const url = `${RESULTS_URL}?q=${encodeURIComponent(captured)}&source=voice`;
        window.location.href = url;
      } else {
        // 결과가 없으면 화면에 문구 표시 상태로 전환
        setPhase("noResult");
      }
    } catch (e) {
      console.error("Search API error:", e);
      // 네트워크/서버 오류도 사용자 입장에선 "결과 없음"과 유사하게 처리
      setPhase("noResult");
    } finally {
      setLoading(false);
    }
  };

  /**
   * onMainButtonClick: 중앙 버튼 1개의 동작 정의
   * - 현재 phase가 "listening"이면: 종료+검색
   * - 그 외(실패/없음/처리완료 등)면: 다시 듣기 시작
   */
  const onMainButtonClick = () => {
    if (phase === "listening") stopListeningAndSearch();
    else startListening();
  };

  const { top, bottom, btnClass } = (() => {
    switch (phase) {
      case "listening":
        return {
          top: (
            <>
              할 말이 끝나면<br/>
              <EmOrange>주황색 버튼</EmOrange>을 누르세요.
            </>
          ),
          bottom: `예) "야채죽", "맛나식당", "두부"`,
          btnClass: "warn",
        };

      case "processing":
        return {
          top: <>{recognizedText}</>,
          bottom: loading ? "검색 중…" : "",
          btnClass: "neutral",
        };

      case "noVoice":
        return {
          top: "인식되지 않음",
          bottom: (
            <>
              다시 시도하려면<br/>
              <EmGray>회색 버튼</EmGray>을 누르세요.
            </>
          ),
          btnClass: "neutral",
        };

      case "noResult":
        return {
          top: (
            <>
              '{recognizedText}'
              <EmMedium>의 검색결과 없음</EmMedium>
            </>
          ),
          bottom: (
            <>
              다시 시도하려면<br/>
              <EmGray>회색 버튼</EmGray>을 누르세요.
            </>
          ),
          btnClass: "neutral",
        };

      default:
        return { top: "", bottom: "", btnClass: "neutral" };
    }
  })();

  const isWarn = btnClass === "warn";

  return (
    <Wrapper>
      {/* 타이틀 영역 */}
      <h1>
        찾는 음식 (또는 식당)
        <br />
        이름이 뭐예요?
      </h1>

      {/* 중앙 텍스트 박스 (흰 배경) */}
      <Content>
        {/* 상단 문구: 상태에 따라 바뀜. \n 줄바꿈은 CSS의 white-space: pre-line으로 처리 */}
        <div className="space">
          <TopText>{top}</TopText>
        </div>

        {/* 중앙 버튼: 한 개로 모든 흐름 제어 */}
        <MainButton
          className={btnClass}
          onClick={onMainButtonClick}
          // 검색중에는 잠깐 비활성화(중복 요청 방지)
          disabled={phase === "processing" && loading}
        >
          <img src="VoiceMic.svg" alt="마이크" />
        </MainButton>

        {/* 하단 문구: 존재할 때만 렌더링 */}
        {bottom && <BottomText className={isWarn ? "warn" : ""}>{bottom}</BottomText>}
      </Content>
    </Wrapper>
  );
};

export default VoiceOrder;


const Wrapper = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;

  h1{
    margin-top: 1.87rem;
    margin-bottom: 2.67rem;
    color: #fff;
    font-size: 2.5rem;
    font-weight: 700;
  }
`;

const Content = styled.div`
  width: 100%;
  height: 35.9375rem;
  background-color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;

  div.space{
    margin-top: 3.44rem;

    height: 6.375rem;     /* = 두 줄 높이 고정 */
    display: flex;
    align-items: center;
    justify-content: center;

    width: 100%;
  }
`;

const TopText = styled.h2`
  color: var(--background-color);
  font-size: 2rem;
  font-weight: 650;
`;

const BottomText = styled.p`
  margin-top: 3.12rem;

  color: var(--background-color);
  font-size: 1.875rem;
  font-weight: 650;

  &.warn {
    margin-top: 5.19rem;

    color: #7B7B7B;
    font-size: 1.5rem;
    font-weight: 650;
  }
`;

/*애니메이션*/
const ringSpread = keyframes`
  0%   { box-shadow: 0 0 0 0 rgba(248,147,23,0.30); opacity: .45; }
  50%  { box-shadow: 0 0 0 42px rgba(248,147,23,0.30); opacity: .85; }
  100% { box-shadow: 0 0 0 0 rgba(248,147,23,0.30); opacity: .45; }
`;

const MainButton = styled.button`
  position: relative; /* ::before 기준 */
  width: 9.375rem;
  aspect-ratio: 1 / 1;      /* 정사각형 → 원형 가능 */
  height: auto;             /* aspect-ratio가 높이를 계산하도록 */
  margin-top: 5.5rem;
  padding: 0;               /* 원형 유지: 패딩 제거 (내용은 flex로 중앙정렬) */


  display: flex;
  justify-content: center;
  align-items: center;

  border-radius: 50%;       /* ✅ 진짜 원형 */
  background: var(--main-color);
  border:none;
  cursor: pointer;

  /* 상태별 색상 (디자인 가이드에 맞춰 값만 교체하면 됨) */
  &.warn {    /* 듣는 중 = 종료 버튼 (주황) */
    background: var(--main-color);
  }
  &.neutral { /* 다시 시도 버튼 (회색) */
    background: #B2B2B2;
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  /* warn일 때만: 최대 보더(42px) 범위 안에서 바깥으로 퍼지는 링 */
  &.warn::before {
    content: "";
    position: absolute;
    inset: 0;   /* 내부 경계(버튼 테두리)와 정확히 맞춤 */
    border-radius: inherit;
    pointer-events: none;
    /* box-shadow의 spread를 애니메이션 → 바깥으로만 두께 증가 */
    box-shadow: 0 0 0 0 rgba(248,147,23,0.30);
    animation: ${ringSpread} 1.2s ease-in-out infinite;
    will-change: box-shadow, opacity;
  }

  /* neutral/disabled일 땐 애니메이션 제거 */
  &.neutral::before,
  &.warn:disabled::before {
    animation: none;
    display: none;
  }
`;