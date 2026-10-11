# KNU Campus Digital Twin — V1

강원대학교 **춘천캠퍼스** 지도 위에서 가상 오염물질이 **이류(advection)**로 이동하고 **확산(diffusion)**으로 퍼지는 모습을 보여주는 교육용 웹앱입니다.

## 1. GitHub Pages에 올리기 (코딩 불필요)

1. GitHub에서 새 **Public** repository를 만듭니다. 예: `knu-campus-twin`.
2. 이 ZIP 파일의 압축을 풉니다.
3. `index.html`, `styles.css`, `app.js`, `config.js`, `.nojekyll`, `README.md` 파일을 repository **최상위(root)**에 업로드하고 Commit합니다. **ZIP 파일 자체만 업로드하면 웹사이트가 실행되지 않습니다.**
4. repository의 **Settings → Pages → Build and deployment**에서 `Deploy from a branch`를 선택합니다.
5. Branch를 `main`, Folder를 `/(root)`로 선택하고 **Save**합니다.
6. 배포가 완료되면 `https://YOUR_USERNAME.github.io/knu-campus-twin/` 형태의 주소로 접속합니다. (YOUR_USERNAME과 repository 이름은 실제 값으로 변경.)

기본 설정은 **OpenStreetMap**이라 네이버 API 키 없이 바로 지도가 열립니다. 지도 타일과 Leaflet 라이브러리를 로드하므로 인터넷 연결은 필요합니다.

## 2. 네이버 위성지도로 전환 (선택 사항)

1. [NAVER Cloud Maps](https://www.ncloud.com/product/applicationService/maps)에서 애플리케이션을 만들고 **Dynamic Map** 사용 권한을 활성화합니다. 이용 요금·한도를 확인하세요.
2. 발급된 **Client ID (ncpKeyId)**를 확인합니다. **Client Secret은 웹사이트에 절대 넣지 마세요.**
3. NAVER Cloud의 Web 서비스 URL/허용 도메인 설정에 GitHub Pages 주소를 등록합니다. 예: `https://YOUR_USERNAME.github.io` (콘솔이 경로를 요구한다면 실제 repository URL도 추가).
4. `config.js`를 아래처럼 바꾸고 GitHub에 다시 업로드합니다.

```js
window.KNU_CONFIG = {
  mapProvider: 'naver',
  naverClientId: 'YOUR_CLIENT_ID',
  campusCenter: { lat: 37.86721, lng: 127.74482 },
  initialSource: { lat: 37.86721, lng: 127.74482 }
};
```

네이버 API 인증이 실패하면 OpenStreetMap으로 자동 전환하도록 구성했습니다. Client ID는 브라우저에 노출되는 공개 식별자이며, **Client Secret이 아닙니다.** API 이용량 및 도메인 제한을 별도로 관리해야 합니다.

## 3. 사용법

- **지도 클릭**: 가상 오염원 위치 변경
- **센서 지정** 선택 후 지도 클릭: 가상 관측 지점 배치 및 상대 농도 확인
- **D**: 확산계수 (m²/min)
- **u**: 흐름 속도 (m/min)
- **방향**: 북쪽 기준 시계방향 (0° 북, 90° 동)
- **Time / Play**: 시간 변화에 따른 농도 분포 재생
- **Quick experiments**: 확산만 / 이류+확산 / 빠른 흐름 비교

## 4. 수학적 모델

이 데모는 **무한한 평면, 균일한 흐름, 일정한 D, 초기 2D Gaussian 오염원**을 가정한 해석해를 시각화합니다.

\[
C(x,y,t) \propto \frac{1}{\sigma_0^2+2Dt}
\exp\left[-\frac{(x-x_0-u_x t)^2+(y-y_0-u_y t)^2}{2(\sigma_0^2+2Dt)}\right]
\]

- `σ0 = 45 m` (초기 폭)
- 시뮬레이션은 **실제 대기 확산, 지형, 건물 장애물, 난류, 실제 센서 데이터**를 반영하지 않습니다.
- 화면에 표시되는 농도는 초기 최고 농도에 대한 **상대값**이며 실제 농도 단위(ppm, mg/m³ 등)가 아닙니다.
- 강의 및 시연을 위한 **simulation-based digital twin prototype**입니다. 실제 물리 시스템에 지속적으로 연결된 운영형 Digital Twin은 아닙니다.

## 5. 파일 구성

- `index.html` — 화면 구조
- `styles.css` — 디자인
- `app.js` — 지도, 시뮬레이션, 컨트롤
- `config.js` — 지도 제공자와 캠퍼스 중심 위치
- `.nojekyll` — GitHub Pages의 불필요한 Jekyll 처리를 방지

## 참고 문서

- [GitHub Pages 설정](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [NAVER Maps JavaScript API 시작하기](https://navermaps.github.io/maps.js.ncp/docs/tutorial-2-Getting-Started.html)
- [NAVER Maps 지도 유형](https://navermaps.github.io/maps.js.ncp/docs/tutorial-MapTypes.html)
- [OpenStreetMap copyright and attribution](https://www.openstreetmap.org/copyright)
