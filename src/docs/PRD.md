# MVP Product Requirements Document

## 1. 개요

**서비스 아이디어:**  
아마추어 축구 동호인들을 위한 개인 및 팀 기록 관리 서비스

**목표 사용자:**  
- 아마추어 축구 동호인 (선수, 팀 관리자)  
- 경기 및 기록 관리에 관심 있는 동호회 구성원

**디자인 컨셉:**  
Notion과 유사한 단순하고 직관적인 디자인

**서비스 이름 제안:**  
- “PlayBook” (경기 기록과 전술을 관리하는 느낌)  

---

## 2. 목표 및 핵심 가치

- **간편한 기록 관리:** 경기 결과, 개인 및 팀 기록을 직관적으로 입력·조회할 수 있음  
- **데이터 기반 인사이트:** 대시보드와 통계 분석을 통해 경기 및 팀의 현황 파악  
- **유연한 팀 관리:** 팀 생성, 초대, 가입, 탈퇴 및 다중 팀 가입 등 다양한 팀 관리 시나리오 지원  
- **경기 일정 관리:** 경기 일정 등록 및 캘린더 연동으로 경기 준비와 참여 관리

---

## 3. MVP 기능 목록

### 3.1 사용자 인증
- **기능:**  
  - 회원가입, 로그인, 비밀번호 재설정  
  - oAuth 연동 (카카오, 구글; Supabase와 연동)

### 3.2 팀 관리
- **기능:**  
  - 팀 생성 및 정보 수정  
  - 팀원 초대 및 가입 승인  
  - **팀원 강퇴 기능:** 팀 관리자가 특정 팀원을 강제로 제거

### 3.3 경기 기록 관리
- **기능:**  
  - **개인 기록:** 골, 어시스트, 출장경기수(연도별 관리)  
  - **팀 기록:** 팀 경기수 대비 참석률 등

### 3.4 대시보드 및 통계 분석
- **기능:**  
  - 경기 데이터 시각화 (시즌별, 경기별 주요 지표)  
  - **맞춤형 대시보드:** 팀 관리자용과 선수용 대시보드 분리 제공  
    - 팀 관리자는 팀 전체 성과, 팀원 통계 등을, 선수는 개인 성과 지표를 확인

### 3.5 사용자 프로필 관리
- **기능:**  
  - 프로필 사진, 개인 소개, 선호 포지션 등 등록 및 수정

### 3.6 경기 일정 관리
- **기능:**  
  - 경기 일정 등록, 조회, 수정, 삭제  
  - 캘린더 연동 기능

### 3.7 사용자 다중 팀 가입 관리
- **기능:**  
  - 한 사용자가 여러 팀에 가입할 경우 역할, 권한, 데이터 및 알림 분리 관리

### 3.8 게스트 팀 등록 기능
- **기능:**  
  - 시스템에 등록되지 않은 팀도 기록 관리를 위해 ‘게스트 팀’ 형태로 등록

### 3.9 상대전적(Head-to-head) 관리 기능
- **기능:**  
  - 각 팀 간의 과거 경기 데이터를 기록하여 head-to-head 형식으로 상대전적 조회

### 3.10 경기 상세 정보 및 전적 요약 기능
- **기능:**  
  - 경기 상세 페이지 제공  
    - 홈/어웨이 팀 참석 인원 정보  
    - 각 팀의 최근 5경기 전적 요약  
    - head-to-head 데이터 연동(과거 대결 결과)

### 3.11 경기 결과 입력 시 팀 운영자의 참석/불참 상태 강제 수정 기능
- **기능:**  
  - 경기 결과 입력 시, 팀 운영자가 해당 경기의 참석/불참 상태를 직접 확인 및 강제 수정

### 3.12 용병 등록 기능
- **기능:**  
  - 경기 일정의 참석 인원 관리 시, 정식 팀원이 아닌 용병을 ‘게스트’ 형태로 등록하여 기록 및 통계 반영

---

## 4. 기술 및 아키텍처 고려 사항

### 백엔드
- **플랫폼:**  
  - Supabase를 활용하여 사용자 인증, 데이터 관리 및 API 제공  
- **API 설계:**  
  - RESTful API로 구현

### 프론트엔드
- **프레임워크:**  
  - Next.js (React 기반)로 SPA 및 SSR(Server Side Rendering) 지원  
- **UI/UX:**  
  - Notion 스타일의 간결하고 직관적인 인터페이스 구현  
- **하이브리드 앱:**  
  - 웹앱 형태로 개발 후, React Native의 WebView를 활용하여 하이브리드 앱으로 제공

### 데이터베이스
- **DBMS:**  
  - PostgreSQL (Supabase가 기본적으로 제공하는 데이터베이스 사용)  
- **모델:**  
  - 사용자, 팀, 경기 기록, 일정 등 관계형 데이터 모델 설계

### 통계 및 대시보드
- **라이브러리:**  
  - Chart.js, D3.js 등 데이터 시각화 라이브러리를 활용하여 대시보드 구현

### 캘린더 연동
- **API:**  
  - Google Calendar API 등 외부 캘린더 서비스 연동 고려

---

## 5. 개발 일정 및 마일스톤

1. **요구사항 정의 및 설계 (2주):**  
   - 최종 기능 목록 확정  
   - 데이터 모델 및 API 설계

2. **기본 기능 개발 (4주):**  
   - 사용자 인증, 팀 관리, 경기 기록 관리  
   - 사용자 다중 팀 가입, 게스트 팀 등록

3. **대시보드 및 일정 관리 개발 (3주):**  
   - 맞춤형 대시보드, 경기 일정 관리, 캘린더 연동

4. **상세 기능 개발 (3주):**  
   - 상대전적 관리, 경기 상세 정보, 결과 입력 시 강제 수정, 용병 등록

5. **테스트 및 배포 (2주):**  
   - 기능 테스트 및 버그 수정  
   - MVP 배포 준비

---

## 6. 향후 확장 기능 (MVP 이후 고려)

- 실시간 알림 및 푸시 알림 기능 (현재는 MVP 범위에서 제외)  
- 경기 전술 분석 및 피드백 기능  
- 소셜 피드 및 커뮤니티 기능

---

## 7. 결론

본 MVP는 아마추어 축구 동호인들이 쉽고 직관적으로 개인 및 팀 기록을 관리할 수 있도록 핵심 기능에 집중합니다.  
기술 스택은 **Supabase**(백엔드 및 PostgreSQL 기반), **Next.js**(프론트엔드) 및 **React Native WebView**를 통한 하이브리드 앱 형태로 구현되어, 다양한 환경에서 안정적인 서비스를 제공할 수 있도록 설계되었습니다.  
향후 사용자 피드백을 반영하여 점진적으로 기능을 확장하고, 데이터 기반 인사이트를 제공하는 서비스로 발전시킬 계획입니다.
