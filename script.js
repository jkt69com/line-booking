const LIFF_ID =
  '2010846374-JwiQPWxJ';

const GAS_API_URL =
  'https://script.google.com/macros/s/AKfycbzFVHSwqMg9mDgcc1bpTSxUhKmrzvIHG4qu54D_ksCGFw511i4SoGSZPd1KcdL7GdNa_g/exec';


const booking = {
  menu: '',
  date: '',
  time: '',
  idToken: ''
};


if (document.readyState === 'loading') {
  document.addEventListener(
    'DOMContentLoaded',
    initializeLiff
  );
} else {
  initializeLiff();
}


/**
 * LINEミニアプリを初期化する
 */
async function initializeLiff() {
  const statusArea =
    document.getElementById('lineUserStatus');

  const startButton =
    document.getElementById('startBookingButton');

  try {
    startButton.disabled = true;

    statusArea.textContent =
      '① LIFFを初期化しています…';

    await liff.init({
      liffId: LIFF_ID
    });

    statusArea.textContent =
      '② LINEのログイン状態を確認しています…';

    if (!liff.isLoggedIn()) {
      statusArea.innerHTML = `
        <p class="error-message">
          LINEへのログインが必要です。
        </p>

        <button
          type="button"
          class="button"
          onclick="loginWithLine()"
        >
          LINEでログイン
        </button>
      `;

      return;
    }

    statusArea.textContent =
      '③ IDトークンを取得しています…';

    const idToken =
      liff.getIDToken();

    if (!idToken) {
      throw new Error(
        'IDトークンを取得できませんでした。'
      );
    }

    booking.idToken = idToken;

    statusArea.textContent =
      '④ LINEユーザーを確認しています…';

    const verifyResult =
      await callGasApi({
        action: 'verifyLineUser',
        idToken: booking.idToken
      });

    if (!verifyResult.success) {
      throw new Error(
        verifyResult.message ||
        'LINEユーザー情報を確認できませんでした。'
      );
    }

    const verifiedUser =
      verifyResult.user;

    statusArea.innerHTML = `
      <div class="user-card">
        ${
          verifiedUser.pictureUrl
            ? `
              <img
                class="user-picture"
                src="${escapeHtml(
                  verifiedUser.pictureUrl
                )}"
                alt=""
              >
            `
            : ''
        }

        <div>
          <div class="user-label">
            予約者
          </div>

          <strong>
            ${escapeHtml(
              verifiedUser.displayName
            )}
          </strong>
        </div>
      </div>
    `;

    startButton.disabled = false;

  } catch (error) {
    console.error(error);

    booking.idToken = '';

    if (startButton) {
      startButton.disabled = true;
    }

    if (statusArea) {
      statusArea.innerHTML = `
        <p class="error-message">
          LINEユーザー情報を取得できませんでした。<br>
          ${escapeHtml(
            error.message || String(error)
          )}
        </p>
      `;
    }
  }
}


/**
 * LINEログインを開始する
 */
function loginWithLine() {
  liff.login({
    redirectUri:
      window.location.href.split('#')[0]
  });
}


/**
 * GASのAPIへPOST送信する
 */
async function callGasApi(requestData) {
  const response =
    await fetch(
      GAS_API_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'text/plain;charset=utf-8'
        },
        body: JSON.stringify(requestData)
      }
    );

  if (!response.ok) {
    throw new Error(
      `サーバー通信エラー：${response.status}`
    );
  }

  try {
    return await response.json();
  } catch (error) {
    throw new Error(
      'サーバーからの応答を読み取れませんでした。'
    );
  }
}


/**
 * 画面へ文字を表示するときの安全対策
 */
function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}


/**
 * 指定した画面だけを表示する
 */
function showScreen(screenId) {
  const screens =
    document.querySelectorAll('.screen');

  screens.forEach((screen) => {
    screen.classList.remove('is-active');
  });

  const targetScreen =
    document.getElementById(screenId);

  if (!targetScreen) {
    console.error(
      `画面が見つかりません: ${screenId}`
    );
    return;
  }

  targetScreen.classList.add('is-active');

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}


/**
 * コースを選択する
 */
function selectMenu(menuName) {
  booking.menu = menuName;
  booking.date = '';
  booking.time = '';

  document
    .getElementById('selectedMenu')
    .textContent = menuName;

  createDateButtons();
  showScreen('dateScreen');
}


/**
 * 今日から14日分の日付ボタンを作る
 */
function createDateButtons() {
  const dateList =
    document.getElementById('dateList');

  dateList.innerHTML = '';

  const weekdays = [
    '日',
    '月',
    '火',
    '水',
    '木',
    '金',
    '土'
  ];

  for (let i = 0; i < 14; i++) {
    const date = new Date();

    date.setDate(
      date.getDate() + i
    );

    const year =
      date.getFullYear();

    const month =
      String(
        date.getMonth() + 1
      ).padStart(2, '0');

    const day =
      String(
        date.getDate()
      ).padStart(2, '0');

    const value =
      `${year}-${month}-${day}`;

    const label =
      `${date.getMonth() + 1}月` +
      `${date.getDate()}日` +
      `（${weekdays[date.getDay()]}）`;

    const button =
      document.createElement('button');

    button.type = 'button';
    button.className = 'selection-item';
    button.textContent = label;

    button.onclick = () => {
      selectDate(value, label);
    };

    dateList.appendChild(button);
  }
}


/**
 * 日付を選択する
 */
async function selectDate(
  dateValue,
  dateLabel
) {
  booking.date = dateValue;
  booking.time = '';

  document
    .getElementById('selectedDate')
    .textContent = dateLabel;

  showScreen('timeScreen');
  showTimeLoading();

  try {
    const result =
      await callGasApi({
        action: 'getAvailableTimes',
        date: booking.date,
        menu: booking.menu
      });

    if (!result.success) {
      throw new Error(
        result.message ||
        '空き時間を取得できませんでした。'
      );
    }

    createTimeButtons(
      result.availableTimes
    );

  } catch (error) {
    handleTimeLoadingError(error);
  }
}


/**
 * 予約可能な時間ボタンを作る
 */
function createTimeButtons(
  availableTimes
) {
  const timeList =
    document.getElementById('timeList');

  timeList.innerHTML = '';

  if (
    !Array.isArray(availableTimes) ||
    availableTimes.length === 0
  ) {
    const message =
      document.createElement('p');

    message.className =
      'empty-message';

    message.textContent =
      'この日に予約できる時間はありません。' +
      '別の日を選択してください。';

    timeList.appendChild(message);
    return;
  }

  availableTimes.forEach((time) => {
    const button =
      document.createElement('button');

    button.type = 'button';
    button.className =
      'selection-item';

    button.textContent = time;

    button.onclick = () => {
      selectTime(time);
    };

    timeList.appendChild(button);
  });
}


/**
 * 空き時間を確認している間の表示
 */
function showTimeLoading() {
  const timeList =
    document.getElementById('timeList');

  timeList.innerHTML = `
    <p class="loading-message">
      空き時間を確認しています…
    </p>
  `;
}


/**
 * 空き時間取得に失敗した場合
 */
function handleTimeLoadingError(error) {
  console.error(error);

  const timeList =
    document.getElementById('timeList');

  timeList.innerHTML = `
    <p class="error-message">
      空き時間を取得できませんでした。<br>
      ${escapeHtml(
        error.message || String(error)
      )}
    </p>
  `;
}


/**
 * 時間を選択して確認画面へ進む
 */
function selectTime(time) {
  booking.time = time;

  document
    .getElementById('confirmMenu')
    .textContent = booking.menu;

  document
    .getElementById('confirmDate')
    .textContent =
      formatDate(booking.date);

  document
    .getElementById('confirmTime')
    .textContent = booking.time;

  showScreen('confirmScreen');
}


/**
 * 2026-07-25を2026年7月25日に変換する
 */
function formatDate(dateValue) {
  const [
    year,
    month,
    day
  ] = dateValue.split('-');

  return (
    `${Number(year)}年` +
    `${Number(month)}月` +
    `${Number(day)}日`
  );
}


/**
 * 予約を登録する
 */
async function submitBooking() {
  const submitButton =
    document.getElementById('submitButton');

  const currentIdToken =
    liff.getIDToken();

  if (!currentIdToken) {
    alert(
      'LINEユーザー情報を確認できません。' +
      'LINEから開き直してください。'
    );
    return;
  }

  booking.idToken =
    currentIdToken;

  submitButton.disabled = true;
  submitButton.textContent =
    '予約処理中…';

  try {
    const result =
      await callGasApi({
        action: 'createBooking',
        menu: booking.menu,
        date: booking.date,
        time: booking.time,
        idToken: booking.idToken
      });

    handleBookingResult(result);

  } catch (error) {
    handleBookingError(error);
  }
}


/**
 * 予約結果を処理する
 */
async function handleBookingResult(result) {
  const submitButton =
    document.getElementById('submitButton');

  submitButton.disabled = false;
  submitButton.textContent =
    'この内容で予約する';

  if (!result.success) {
    alert(
      result.message ||
      '予約を登録できませんでした。'
    );

    showScreen('timeScreen');
    showTimeLoading();

    try {
      const reloadResult =
        await callGasApi({
          action: 'getAvailableTimes',
          date: booking.date,
          menu: booking.menu
        });

      if (!reloadResult.success) {
        throw new Error(
          reloadResult.message ||
          '空き時間を再取得できませんでした。'
        );
      }

      createTimeButtons(
        reloadResult.availableTimes
      );

    } catch (error) {
      handleTimeLoadingError(error);
    }

    return;
  }

  document
    .getElementById('completeMenu')
    .textContent = booking.menu;

  document
    .getElementById('completeDate')
    .textContent =
      formatDate(booking.date);

  document
    .getElementById('completeTime')
    .textContent = booking.time;

  showScreen('completeScreen');
}


/**
 * 予約通信に失敗した場合
 */
function handleBookingError(error) {
  const submitButton =
    document.getElementById('submitButton');

  console.error(error);

  alert(
    '通信中にエラーが発生しました。\n' +
    (
      error.message ||
      'もう一度お試しください。'
    )
  );

  submitButton.disabled = false;
  submitButton.textContent =
    'この内容で予約する';
}


/**
 * 予約完了後、最初の画面へ戻す
 */
function resetBooking() {
  booking.menu = '';
  booking.date = '';
  booking.time = '';

  const submitButton =
    document.getElementById('submitButton');

  if (submitButton) {
    submitButton.disabled = false;
    submitButton.textContent =
      'この内容で予約する';
  }

  const dateList =
    document.getElementById('dateList');

  if (dateList) {
    dateList.innerHTML = '';
  }

  const timeList =
    document.getElementById('timeList');

  if (timeList) {
    timeList.innerHTML = '';
  }

  showScreen('homeScreen');
}
