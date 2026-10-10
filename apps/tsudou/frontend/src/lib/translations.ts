// Japanese source text maps to English UI text. User-provided content is never translated.
export const english: Record<string, string> = {
  '何もしなくても {0} 以降に自動削除されます。': 'Automatically deleted on or after {0}.',
  'イベントが指定されていません。': 'No event was specified.',
  イベントを作成しました: 'Event created',
  'このページを閉じる前に、ブックマークするか自分宛てに送っておいてください。':
    'Before closing this page, bookmark the URL or send it to yourself.',
  '管理用 URL を表示できません': 'Management URL unavailable',
  '管理トークンはブラウザに保存しないため、作成直後のこの画面でしか表示できません。 ページを再読み込みした場合や、別のブラウザで開いた場合は表示されません。':
    'Management tokens are not saved in your browser, so this URL is available only immediately after creation. It will not appear after reloading or opening another browser.',
  'このイベントと回答は、作成から':
    'This event and its responses will be deleted automatically after ',
  'ヶ月後に自動削除されます。': ' months from creation.',
  イベントが見つかりません: 'Event not found',
  'URL が正しいか確認してください。すでに削除された可能性もあります。':
    'Check the URL. The event may already have been deleted.',
  トップへ戻る: 'Back to home',
  読み込みに失敗しました: 'Failed to load',
  不明なエラーが発生しました: 'An unknown error occurred',
  '管理用 URL が必要です': 'Management URL required',
  'このイベントを編集するには、作成時に発行された管理用 URL （':
    'To edit this event, open the management URL issued at creation (with ',
  'が付いたもの）を開いてください。管理トークンはブラウザに保存しないため、 ページを再読み込みした場合も管理用 URL を開き直す必要があります。':
    '). Management tokens are not saved in your browser, so you must reopen that URL after reloading.',
  イベントページを見る: 'View event page',
  '「{0}」の回答を削除します。よろしいですか?': 'Delete the response from “{0}”?',
  'イベントと、すべての回答を削除します。元に戻せません。よろしいですか?':
    'Delete this event and all responses? This cannot be undone.',
  イベントの管理: 'Manage event',
  参加者から見た画面: 'Participant view',
  内容を編集: 'Edit details',
  回答状況: 'Responses',
  削除: 'Delete',
  締切と削除: 'Close or delete',
  '締切中です。参加者は回答できません。': 'Responses are closed. Participants cannot respond.',
  '受付中です。締め切ると新しい回答・編集ができなくなります。':
    'Responses are open. Closing prevents new responses and edits.',
  受付を再開する: 'Reopen responses',
  回答を締め切る: 'Close responses',
  'イベントとすべての回答を削除します。元に戻せません。':
    'Delete this event and all responses. This cannot be undone.',
  イベントを削除: 'Delete event',
  'URL が正しいか確認してください。イベントが削除された可能性もあります。':
    'Check the URL. The event may have been deleted.',
  '自分の回答を削除します。よろしいですか?': 'Delete your response?',
  締切済み: 'Closed',
  'このイベントを編集する（管理ページ）': 'Edit this event (management page)',
  名が回答済み: ' participants have responded',
  自分の回答を編集: 'Edit your response',
  出欠を回答する: 'Respond to the event',
  'このイベントは締め切られているため、回答できません。':
    'This event is closed and no longer accepts responses.',
  '回答を保存しました。': 'Response saved.',
  '回答編集 URL に対応する回答が見つかりません。すでに削除された可能性があります。':
    'The response for this edit URL was not found. It may have been deleted.',
  '回答編集 URL': 'Response edit URL',
  'あとで回答を変更・削除するにはこの URL が必要です。ページを閉じる前にブックマークするか自分宛てに送ってください。他の人には共有しないでください。':
    'You need this URL to change or delete your response later. Bookmark it or send it to yourself before closing this page. Do not share it with others.',
  自分の回答を削除: 'Delete your response',
  'このイベントの共有 URL': 'Share this event',
  使い方: 'User guide',
  'Tsudou はログイン不要の日程調整ツールです。主催者がイベントを作って URL を送り、参加者はその URL を開いて候補日ごとに ○（参加）/ △（未定）/ ×（不参加）で回答します。':
    'Tsudou helps you schedule events without signing in. Hosts create an event and send its URL; participants open it and choose ○ (yes), △ (maybe), or × (no) for each date.',
  目次: 'Table of contents',
  'イベント管理者（主催者）の使い方': 'Guide for hosts',
  イベント参加者の使い方: 'Guide for participants',
  よくある質問: 'Frequently asked questions',
  '画面はサンプルデータ（「チーム歓迎会」の日程調整）で表示した例です。日付や URL は実際の画面と異なります。':
    'Screenshots use sample data for a team welcome party. Dates and URLs differ from your event.',
  'イベントを作成し、参加者の回答を見て日程を決めるまでの流れです。':
    'Create an event, review responses, and choose a date.',
  イベントを作成する: 'Create an event',
  トップページ: 'Home page',
  'で次の項目を入力し、「イベントを作成して URL を発行」を押します。':
    ': fill in the following fields and select “Create event and get URLs”.',
  イベント名: 'Event title',
  '（必須）: 参加者に表示される名前です。': ' (required): the name participants will see.',
  日時の候補: 'Candidate dates',
  '（必須）: 「＋ 候補を追加」で最大 30 件まで追加できます。追加した行には直前の候補の翌日・同じ時刻が入るので、連日の候補も手早く並べられます。':
    ' (required): add up to 30 with “＋ Add candidate”. New rows default to the following day at the same time, making consecutive dates easy to enter.',
  参加費: 'Fee',
  メモ: 'Memo',
  '（任意）: 会費や集合場所など、参加者に伝えたいことを書きます。':
    ' (optional): add the fee, meeting point, or other information for participants.',
  'イベント作成フォーム。イベント名に「チーム歓迎会」、日時の候補に 3 週ぶんの金曜 19:00、参加費に 4000、メモに会場と会費の案内を入力した状態':
    'Event creation form with a team welcome party title, three Friday candidates at 19:00, a fee of 4,000 yen, and venue and payment notes',
  '2 つの URL を控える': 'Save both URLs',
  '作成が終わると、2 種類の URL が表示されます。': 'After creation, two URLs appear.',
  '共有用 URL': 'Shared URL',
  ': 参加者に送る URL です。': ': send this URL to participants.',
  '管理用 URL': 'Management URL',
  ': イベントの編集・締切・削除に使う、主催者だけの URL です。他の人には共有しないでください。':
    ': a private URL for the host to edit, close, or delete the event. Do not share it with others.',
  '作成完了画面。共有用 URL と管理用 URL が、それぞれコピー・開く・共有ボタン付きで表示されている':
    'Creation confirmation with shared and management URLs and copy, open, and share buttons',
  '管理用 URL は再表示できません': 'Keep your management URL',
  'ログインが無いため、管理用 URL を表示できるのはこの画面だけです。ページを閉じる前に「コピー」してメモに貼るか、ブックマークしてください。':
    'Without sign-in, the management URL is shown only here at creation. Select “Copy” and save it in a note, or bookmark it before closing the page.',
  '共有用 URL を参加者に送る': 'Send the shared URL to participants',
  '「コピー」した共有用 URL を、チャットやメールで参加者に送ります。スマートフォンでは「共有」ボタンから直接アプリに送れます。 参加者はログインせずに回答できます。':
    'Copy the shared URL and send it by chat or email. On smartphones, “Share” sends it directly to another app. Participants do not need to sign in.',
  管理ページで回答状況を確認する: 'Review responses on the management page',
  '管理用 URL を開くと管理ページが表示されます。上部には共有用 URL と管理用 URL がいつでも表示されるので、送り忘れた場合もここからコピーできます。 「参加者から見た画面」で、参加者と同じイベントページを確認できます。':
    'Open the management URL to manage the event. Shared and management URLs remain available at the top for copying. Select “Participant view” to see the event as participants do.',
  '管理ページの上部。イベント名「チーム歓迎会」と、共有用 URL・管理用 URL のコピー欄':
    'Top of the management page with the team welcome party title and fields for copying shared and management URLs',
  '「回答状況」には回答者ごとの ○△× が一覧で表示されます。各候補の見出しに ○△× の人数が出て、○ がいちばん多い候補は緑色で「最多」と示されます。 いたずらや重複の回答は、行の右の「削除」で消せます。':
    "“Responses” lists each person's ○△× choices and the counts per candidate. The best candidate is highlighted in green. Remove unwanted or duplicate responses with “Delete” beside the row.",
  '管理ページの回答状況。4 名の回答が並び、○ が 4 人の 3 つ目の候補が「最多」として強調されている。各回答の右に削除ボタン':
    'Management response table with four respondents, the third candidate highlighted as best, and a delete button for each response',
  'この例では 3 つ目の候補に全員が参加でき、「最多」になっています':
    'Everyone can attend the third candidate in this example, making it the best option',
  内容を編集する: 'Edit details',
  '「内容を編集」で、イベント名・候補・参加費・メモをあとから変更できます。 変更は「変更を保存」を押すと参加者の画面にも反映されます。':
    'Under “Edit details”, change the title, candidates, fee, or memo. Select “Save changes” to update the participant view too.',
  '候補を削除すると、その候補への回答も消えます。':
    'Deleting a candidate also removes the choices for it.',
  '候補を追加すると、すでに回答した人のその候補は「△ 未定」になります。':
    "Adding a candidate sets existing respondents' choices for it to “△ Maybe”.",
  '管理ページの内容の編集フォーム。作成時と同じイベント名・候補・参加費・メモの入力欄':
    'Management edit form with the same title, candidate, fee, and memo fields as creation',
  '回答を締め切る・イベントを削除する': 'Close responses or delete the event',
  '日程が決まったら「回答を締め切る」を押します。締切中は参加者が新しく回答したり、回答を変更したりできなくなります。 「受付を再開する」でいつでも元に戻せます。':
    'Once you choose a date, select “Close responses”. Participants can no longer submit or edit responses. Select “Reopen responses” to resume at any time.',
  '「イベントを削除」を押すと、イベントとすべての回答が削除されます（元に戻せません）。 削除しなくても、作成から':
    '“Delete event” removes the event and all responses permanently. Even without deleting it, automatic deletion occurs after ',
  'ヶ月後に自動で削除されます。': ' months from creation.',
  '管理ページの締切と削除。「回答を締め切る」ボタンと「イベントを削除」ボタン、自動削除日の案内':
    'Management controls for closing responses and deleting the event, with the automatic deletion date',
  '主催者から届いた URL を開いて、出欠を回答するまでの流れです。登録やログインは要りません。':
    'Open the URL from the host and submit your attendance. No registration or sign-in is needed.',
  '共有された URL を開く': 'Open the shared URL',
  '主催者から届いた URL を開くと、イベントの内容（参加費・メモなど）が表示されます。':
    "Open the host's URL to see the event details, including the fee and memo.",
  'イベントページの上部。イベント名「チーム歓迎会」、参加費 ¥4,000、メモ、自動削除日':
    'Top of the event page with the team welcome party title, a fee of 4,000 yen, memo, and automatic deletion date',
  ほかの人の回答状況を見る: "View other participants' responses",
  '「回答状況」で、ほかの参加者がどの日に参加できるかを確認できます。○ がいちばん多い候補は緑色で「最多」と表示されます。メッセージ付きの回答は表の下に並びます。':
    'Check “Responses” to see when others can attend. The best candidate is highlighted in green. Messages appear below the table.',
  'イベントページの回答状況。3 名の ○△× が表で表示され、表の下に佐藤 花子さんのメッセージ':
    "Event response table with three respondents' ○△× choices and a participant message below",
  '「出欠を回答する」で次を入力し、「回答する」を押します。':
    'Under “Respond to the event”, fill in the following and select “Submit response”.',
  お名前: 'Your name',
  '（必須）: 回答状況の一覧に表示されます。同じイベントで同じ名前は使えません。':
    ' (required): displayed in the response list. Each name can be used only once per event.',
  参加できる日時: 'Available dates',
  ': 候補ごとに「○ 参加」「△ 未定」「× 不参加」を選びます。 右上の「一括」を使うと、すべての候補をまとめて同じ回答にできます。':
    ': choose “○ Yes”, “△ Maybe”, or “× No” for each candidate. Use “Set all” at the top right to give every candidate the same response.',
  メッセージ: 'Message',
  '（任意）: 「遅れて参加します」などの補足を書けます。':
    ' (optional): add details such as “I will arrive late”.',
  '回答フォーム。お名前に「田中 健太」、1 つ目と 3 つ目の候補に「○ 参加」、2 つ目に「× 不参加」を選び、メッセージを入力した状態':
    'Response form with a sample name, yes for the first and third candidates, no for the second, and a message',
  '回答編集 URL を控える': 'Save your response edit URL',
  '回答すると「回答を保存しました。」と表示され、':
    'After submitting, “Response saved.” appears and a ',
  'が発行されます。あとで回答を変更・削除するにはこの URL が必要です。':
    ' is issued. You need it to change or delete your response later.',
  '回答後の画面。「回答を保存しました。」の表示と、回答編集 URL のコピー欄、回答内容の編集フォームと「自分の回答を削除」ボタン':
    'After submission: saved confirmation, response edit URL, populated edit form, and delete response button',
  '回答編集 URL は再表示できません': 'Keep your response edit URL',
  'ページを閉じる前に「コピー」してメモに貼るか、ブックマークしてください。この URL を知っている人はあなたの回答を変更できるので、他の人には共有しないでください。':
    'Before closing the page, select “Copy” and save the URL in a note, or bookmark it. Anyone with this URL can change your response, so keep it private.',
  '回答を変更・削除する': 'Change or delete your response',
  '控えておいた回答編集 URL を開くと、自分の回答が入った状態のフォームが表示されます。 内容を直して「回答を更新する」を押すと変更でき、「自分の回答を削除」で回答を取り消せます。 回答状況の表では、自分の行に「自分」と表示されます。':
    'Open your saved response edit URL to see the form with your response. Edit it and select “Update response”, or select “Delete your response” to remove it. Your row in the response table is marked “You”.',
  締め切られた場合: 'When responses are closed',
  '主催者が回答を締め切ると、回答フォームの代わりに次の案内が表示され、新しい回答や変更はできなくなります。 回答状況はそのまま見られます。':
    'When the host closes responses, a notice replaces the form. New responses and edits are disabled, but you can still view the response table.',
  '締切後のイベントページ。「このイベントは締め切られているため、回答できません。」という案内':
    'Closed event page with a notice that the event no longer accepts responses',
  '管理用 URL（または回答編集 URL）をなくしました': 'I lost the management or response edit URL',
  '再発行はできません。共有 PC で他の人に使われないよう、URL に含まれる鍵をブラウザにもサーバにも平文では残していないためです。 管理用 URL をなくした場合は、新しくイベントを作り直してください。':
    'URLs cannot be reissued. Their keys are not saved in plaintext in the browser or server, to protect users on shared computers. If you lose the management URL, create a new event.',
  '「管理用 URL が必要です」と表示されます': 'I see “Management URL required”',
  '管理ページを再読み込みすると、鍵が画面から消えるため操作できなくなります。控えておいた管理用 URL（末尾に':
    'Reloading the management page clears the key from memory. Reopen your saved management URL (ending in ',
  'が付いたもの）を開き直してください。': ').',
  '「この名前はすでに回答済みです」と表示されます': 'I see “This name has already responded”',
  '同じイベントで同じ名前は 1 回しか回答できません。自分の回答を直したい場合は、回答時に控えた回答編集 URL を開いてください。別の人の場合は、名前を少し変えて（名字を足すなど）回答してください。':
    'Each name can respond only once per event. To edit your response, open the edit URL you saved after submitting. If you are a different person, use a distinguishable name, such as adding your surname.',
  イベントページは安全ですか: 'Is the event page safe?',
  '共有用 URL を知っている人は、ログインせずにイベントの内容と回答状況（お名前・○△×・メッセージ）を見られます。 URL には推測できないランダムな文字列を使い、検索エンジンにも載らないようにしていますが、URL が転送されればその人も見られます。 送る相手に気をつけ、電話番号や住所など知られて困る情報は書かないでください。':
    'Anyone with the share URL can view the event details and responses (names, ○△×, and messages) without signing in. The URL contains an unguessable random string and is kept out of search engines, but anyone it is forwarded to can view it too. Be careful who you send it to, and do not write anything you would not want others to know, such as phone numbers or addresses.',
  'ページを見られても、イベントや回答を変更されることはありません。 変更には管理用 URL・回答編集 URL に含まれる鍵が必要で、サーバには鍵そのものではなく、元に戻せない形に変換した値だけを保存しています。':
    'Viewing the page does not let anyone change the event or responses. Changes require the key in the management URL or response edit URL, and the server stores only an irreversibly transformed value, never the key itself.',
  データはいつまで残りますか: 'How long is data kept?',
  'イベントと回答は、作成から': 'Events and responses are deleted automatically after ',
  'ヶ月後に自動で削除されます。編集や回答をしても期限は延びません。削除される日付はイベントページと管理ページに表示されます。':
    ' months from creation. Edits and responses do not extend the deadline. The deletion date appears on the event and management pages.',
  イベントを作成: 'Create an event',
  '作成すると共有用の URL が発行されます。参加予定者はログインなしで回答できます。':
    'Creating an event issues a shared URL. Participants can respond without signing in.',
  '作成したイベントと回答は、作成から': 'Events and responses are deleted automatically after ',
  はじめての方は: 'New to Tsudou? See the ',
  'をご覧ください。': '.',
  'イベントを作成して URL を発行': 'Create event and get URLs',
  ページが見つかりません: 'Page not found',
  'URL が正しいかご確認ください。': 'Please check the URL.',
  イベント日程調整: 'Event scheduling',
  新しく作る: 'New event',
  '一覧に表示されます。': 'Shown in the response list.',
  '山田 太郎': 'Alex Smith',
  '一括:': 'Set all:',
  '{0} の出欠': 'Attendance for {0}',
  'メッセージ (任意)': 'Message (optional)',
  '遅れて参加する、などの補足があれば。': 'Add details such as arriving late.',
  '20時から合流します': 'I will join at 20:00',
  回答する: 'Submit response',
  回答を更新する: 'Update response',
  回答者: 'Respondent',
  最多: 'Best',
  'まだ回答がありません。': 'No responses yet.',
  自分: 'You',
  '候補 {0} の日時': 'Date/time for candidate {0}',
  '候補 {0} を削除': 'Delete candidate {0}',
  '＋ 候補を追加': '＋ Add candidate',
  候補は: 'Maximum ',
  '件までです。': ' candidates.',
  '保存しました。': 'Saved.',
  変更を保存: 'Save changes',
  新年会: 'New Year party',
  '参加予定者はこの候補ごとに ○ / △ / × で回答します。':
    'Participants choose ○ / △ / × for each candidate.',
  '参加費 (任意)': 'Fee (optional)',
  '円。空欄なら「未設定」、0 なら「無料」と表示されます。':
    'Yen. Leave empty for “Not set”, or enter 0 for “Free”.',
  'メモ (任意)': 'Memo (optional)',
  '集合場所、持ち物、支払い方法など。': 'Meeting point, items to bring, payment details, etc.',
  自動削除: 'Automatic deletion',
  以降に削除されます: ' or later',
  '参加予定者に送る URL です。': 'Send this URL to participants.',
  'イベントの編集・締切・削除ができます。他の人には共有しないでください。':
    'Edit, close, or delete the event. Do not share this URL with others.',
  'この URL をコピーしてください': 'Please copy this URL',
  コピーしました: 'Copied',
  コピー: 'Copy',
  開く: 'Open',
  共有: 'Share',
  システム設定に合わせる: 'Follow system settings',
  ライトテーマ: 'Light theme',
  ダークテーマ: 'Dark theme',
  テーマ: 'Theme',
  '読み込み中...': 'Loading...',
  参加: 'Yes',
  不参加: 'No',
  未定: 'Maybe',
  未設定: 'Not set',
  無料: 'Free',
  '(不正な日時)': '(Invalid date/time)',
  言語: 'Language',
  日時を入力してください: 'Enter a date and time.',
  参加費は0以上の整数で入力してください: 'Enter a nonnegative whole number for the fee.',
  参加費は整数で入力してください: 'Enter a whole number for the fee.',
  日時の候補を1つ以上追加してください: 'Add at least one candidate date.',
  日時の形式が正しくありません: 'Invalid date/time format.',
  同じ日時の候補が重複しています: 'Candidate dates must be unique.',
  過去の日時は候補にできません: 'Candidate dates cannot be in the past.',
  過去の日時の候補があります: 'Some candidate dates are in the past.',
  入力されていない候補があります: 'Some candidate dates are missing or invalid.',
  候補の識別子が重複しています: 'Candidate IDs must be unique.',
  すべての候補に回答してください: 'Respond to every candidate.',
  回答の値が正しくありません: 'Invalid response choice.',
  同じ候補に対する回答が重複しています: 'Choose only one response per candidate.',
  存在しない候補に対する回答が含まれています:
    'Your response includes an unknown candidate. Refresh the event and try again.',
  リクエストの形式が正しくありません: 'Invalid request format.',
  権限がありません: 'Permission denied.',
  この名前はすでに回答済みです: 'This name has already responded.',
  このイベントは締め切られています: 'Responses are closed for this event.',
  '管理用 URL が正しくありません': 'Invalid management URL.',
  回答が見つかりません: 'Response not found.',
  この回答を編集する権限がありません: 'You do not have permission to edit this response.',
  この回答を削除する権限がありません: 'You do not have permission to delete this response.',
  '処理に失敗しました。時間をおいて再度お試しください':
    'The operation failed. Please try again later.',
  'アクセスが集中しています。時間をおいて再度お試しください':
    'Too many requests. Please try again later.',
  '通信に失敗しました。接続を確認して再度お試しください':
    'Connection failed. Check your connection and try again.',
  '通信に失敗しました。時間をおいて再度お試しください':
    'Connection failed. Please try again later.',
  予期しないエラーが発生しました: 'An unexpected error occurred.',
  'ヘッダーで「日本語」または「English」を選ぶと、表示言語を切り替えられます。選択はこのブラウザに保存されます。入力したイベント名やメッセージは翻訳されません。':
    'Choose 日本語 or English in the header to change the display language. Your choice is saved in this browser. Event titles and messages you enter are not translated.',
  '集合: 渋谷駅ハチ公前\n会費は当日現金でお願いします':
    'Meet at the station entrance\nPlease pay in cash on the day',
};
