// school-dashboard.js - 学校管理画面の機能（v2 - 確認ダイアログ付き）

// グローバル変数
let currentMode = 'checkin'; // 'checkin' or 'checkout'
let html5QrCode = null;
let pendingStudent = null;
let pendingRecord = null;

// 認証チェック
function checkAuth() {
    const currentSchool = JSON.parse(localStorage.getItem('currentSchool') || 'null');
    if (!currentSchool) {
        window.location.replace('index.html');
        return null;
    }
    return currentSchool;
}

// 初期化
let currentSchool = checkAuth();
if (currentSchool) {
    document.getElementById('schoolName').textContent = currentSchool.name;
    initScanner();
    loadTodayData();
    loadMonthlyData();
    loadStudentsData();
}

// ログアウト
function logout() {
    if (html5QrCode) {
        html5QrCode.stop().then(() => {
            localStorage.removeItem('currentSchool');
            window.location.replace('index.html');
        }).catch(() => {
            localStorage.removeItem('currentSchool');
            window.location.replace('index.html');
        });
    } else {
        localStorage.removeItem('currentSchool');
        window.location.replace('index.html');
    }
}

// モード切り替え
function setMode(mode) {
    currentMode = mode;
    
    // ボタンのスタイル更新
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    if (mode === 'checkin') {
        document.querySelector('.mode-btn.checkin').classList.add('active');
        document.getElementById('scannerStatus').innerHTML = '登校モード：QRコードをスキャンしてください';
        document.getElementById('scannerStatus').className = 'scanner-status active';
    } else {
        document.querySelector('.mode-btn.checkout').classList.add('active');
        document.getElementById('scannerStatus').innerHTML = '下校モード：QRコードをスキャンしてください';
        document.getElementById('scannerStatus').className = 'scanner-status active';
    }
}

// QRスキャナー初期化
function initScanner() {
    html5QrCode = new Html5Qrcode("reader");
    
    // フロントカメラを使用
    html5QrCode.start(
        { facingMode: "user" }, // "user" = フロントカメラ（インカメラ）
        {
            fps: 10,
            qrbox: { width: 250, height: 250 }
        },
        onScanSuccess,
        onScanError
    ).catch(err => {
        console.error("カメラの起動に失敗しました:", err);
        // フロントカメラが使えない場合はリアカメラを試す
        html5QrCode.start(
            { facingMode: "environment" },
            {
                fps: 10,
                qrbox: { width: 250, height: 250 }
            },
            onScanSuccess,
            onScanError
        ).catch(err2 => {
            console.error("カメラの起動に失敗しました:", err2);
        });
    });
}

// スキャン成功時の処理
function onScanSuccess(decodedText) {
    const studentNumber = decodedText;
    const students = JSON.parse(localStorage.getItem('students') || '[]');
    const student = students.find(s => s.studentNumber === studentNumber);
    
    if (!student) {
        showMessage('学生が見つかりません', false);
        return;
    }
    
    if (student.schoolId !== currentSchool.id) {
        showMessage('この学生は別の学校に登録されています', false);
        return;
    }
    
    // 確認ダイアログを表示
    showConfirmationDialog(student);
}

function onScanError(error) {
    // エラーは無視（スキャン中は常にエラーが発生するため）
}

// 確認ダイアログを表示
function showConfirmationDialog(student) {
    const attendance = JSON.parse(localStorage.getItem('attendance') || '[]');
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const currentTime = now.toTimeString().split(' ')[0];
    
    // 本日の出席記録を確認
    const todayRecord = attendance.find(a => 
        a.studentId === student.id && 
        a.checkInDate === today
    );
    
    pendingStudent = student;
    
    const dialogTitle = document.getElementById('dialogTitle');
    const dialogStudent = document.getElementById('dialogStudent');
    const dialogTime = document.getElementById('dialogTime');
    const dialogDuration = document.getElementById('dialogDuration');
    
    if (currentMode === 'checkin') {
        // 登校モード
        if (todayRecord && !todayRecord.checkOutTime) {
            // 既に登校済み
            dialogTitle.textContent = '⚠️ 既に登校済みです';
            dialogStudent.textContent = `学生: ${student.lastName}`;
            dialogTime.textContent = `登校時刻: ${todayRecord.checkInTime}`;
            dialogDuration.textContent = '';
            showMessage(`${student.lastName} さんは既に登校済みです`, false);
            return;
        } else if (todayRecord && todayRecord.checkOutTime) {
            // 下校済み（再登校）
            dialogTitle.textContent = '⚠️ 本日は既に下校済みです';
            dialogStudent.textContent = `学生: ${student.lastName}`;
            dialogTime.textContent = `下校時刻: ${todayRecord.checkOutTime}`;
            dialogDuration.textContent = '';
            showMessage(`${student.lastName} さんは既に下校済みです`, false);
            return;
        } else {
            // 登校処理
            pendingRecord = {
                id: 'ATT' + Date.now(),
                studentId: student.id,
                schoolId: currentSchool.id,
                checkInDate: today,
                checkInTime: currentTime,
                checkOutTime: null,
                duration: null
            };
            
            dialogTitle.textContent = '📥 登校を記録しますか？';
            dialogStudent.textContent = `学生: ${student.lastName}`;
            dialogTime.textContent = `時刻: ${currentTime}`;
            dialogDuration.textContent = '';
        }
    } else {
        // 下校モード
        if (!todayRecord) {
            // 登校記録がない
            dialogTitle.textContent = '⚠️ 登校記録がありません';
            dialogStudent.textContent = `学生: ${student.lastName}`;
            dialogTime.textContent = '先に登校を記録してください';
            dialogDuration.textContent = '';
            showMessage(`${student.lastName} さんの登校記録がありません`, false);
            return;
        } else if (todayRecord.checkOutTime) {
            // 既に下校済み
            dialogTitle.textContent = '⚠️ 既に下校済みです';
            dialogStudent.textContent = `学生: ${student.lastName}`;
            dialogTime.textContent = `下校時刻: ${todayRecord.checkOutTime}`;
            dialogDuration.textContent = `滞在時間: ${todayRecord.duration}`;
            showMessage(`${student.lastName} さんは既に下校済みです`, false);
            return;
        } else {
            // 下校処理
            const checkIn = new Date(`${today} ${todayRecord.checkInTime}`);
            const checkOut = new Date(`${today} ${currentTime}`);
            const duration = Math.floor((checkOut - checkIn) / 1000 / 60); // 分単位
            const durationText = `${Math.floor(duration / 60)}時間${duration % 60}分`;
            
            pendingRecord = todayRecord;
            pendingRecord.checkOutTime = currentTime;
            pendingRecord.duration = durationText;
            
            dialogTitle.textContent = '📤 下校を記録しますか？';
            dialogStudent.textContent = `学生: ${student.lastName}`;
            dialogTime.textContent = `登校: ${todayRecord.checkInTime} → 下校: ${currentTime}`;
            dialogDuration.textContent = `滞在時間: ${durationText}`;
        }
    }
    
    // ダイアログを表示
    document.getElementById('dialogOverlay').classList.add('show');
    document.getElementById('confirmationDialog').classList.add('show');
}

// 出席を確定
function confirmAttendance() {
    const attendance = JSON.parse(localStorage.getItem('attendance') || '[]');
    
    if (currentMode === 'checkin') {
        // 登校を追加
        attendance.push(pendingRecord);
        localStorage.setItem('attendance', JSON.stringify(attendance));
        showMessage(`${pendingStudent.lastName} さんが登校しました`, true);
    } else {
        // 下校を更新
        const index = attendance.findIndex(a => a.id === pendingRecord.id);
        if (index !== -1) {
            attendance[index] = pendingRecord;
            localStorage.setItem('attendance', JSON.stringify(attendance));
            showMessage(`${pendingStudent.lastName} さんが下校しました（滞在時間: ${pendingRecord.duration}）`, true);
        }
    }
    
    // ダイアログを閉じる
    closeDialog();
    
    // データを再読み込み
    loadTodayData();
}

// ダイアログを閉じる
function closeDialog() {
    document.getElementById('dialogOverlay').classList.remove('show');
    document.getElementById('confirmationDialog').classList.remove('show');
    pendingStudent = null;
    pendingRecord = null;
}

// メッセージ表示
function showMessage(message, isSuccess) {
    const messageDiv = document.getElementById('scanMessage');
    messageDiv.textContent = message;
    messageDiv.style.background = isSuccess ? '#d4edda' : '#f8d7da';
    messageDiv.style.color = isSuccess ? '#155724' : '#721c24';
    messageDiv.classList.add('show');
    
    setTimeout(() => {
        messageDiv.classList.remove('show');
    }, 3000);
}

// タブ切り替え
function switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById(tabName).classList.add('active');
}

// 本日のデータ読み込み
function loadTodayData() {
    const attendance = JSON.parse(localStorage.getItem('attendance') || '[]');
    const students = JSON.parse(localStorage.getItem('students') || '[]');
    const today = new Date().toISOString().split('T')[0];
    
    const studentMap = {};
    students.forEach(s => {
        studentMap[s.id] = s;
    });
    
    const todayAttendance = attendance.filter(a => 
        a.checkInDate === today && a.schoolId === currentSchool.id
    );
    
    if (todayAttendance.length === 0) {
        document.getElementById('todayData').innerHTML = '<p style="color: #666;">本日の出席記録はありません</p>';
        return;
    }
    
    let html = '<table><thead><tr><th>学生番号</th><th>名前</th><th>登校時刻</th><th>下校時刻</th><th>滞在時間</th><th>状態</th></tr></thead><tbody>';
    
    todayAttendance.forEach(a => {
        const student = studentMap[a.studentId];
        if (!student) return;
        
        const status = a.checkOutTime ? 
            '<span class="status-badge out">下校済み</span>' : 
            '<span class="status-badge in">登校中</span>';
        
        html += `
            <tr>
                <td>${student.studentNumber}</td>
                <td>${student.lastName}</td>
                <td>${a.checkInTime}</td>
                <td>${a.checkOutTime || '-'}</td>
                <td>${a.duration || '-'}</td>
                <td>${status}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    document.getElementById('todayData').innerHTML = html;
}

// 月別データ読み込み
function loadMonthlyData() {
    const monthInput = document.getElementById('monthFilter');
    if (!monthInput.value) {
        const now = new Date();
        monthInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    
    const attendance = JSON.parse(localStorage.getItem('attendance') || '[]');
    const students = JSON.parse(localStorage.getItem('students') || '[]');
    const selectedMonth = monthInput.value;
    
    const studentMap = {};
    students.forEach(s => {
        studentMap[s.id] = s;
    });
    
    const monthlyAttendance = attendance.filter(a => 
        a.checkInDate.startsWith(selectedMonth) && a.schoolId === currentSchool.id
    );
    
    if (monthlyAttendance.length === 0) {
        document.getElementById('monthlyData').innerHTML = '<p style="color: #666;">該当月の出席記録はありません</p>';
        return;
    }
    
    let html = '<table><thead><tr><th>日付</th><th>学生番号</th><th>名前</th><th>登校時刻</th><th>下校時刻</th><th>滞在時間</th></tr></thead><tbody>';
    
    monthlyAttendance.forEach(a => {
        const student = studentMap[a.studentId];
        if (!student) return;
        
        html += `
            <tr>
                <td>${a.checkInDate}</td>
                <td>${student.studentNumber}</td>
                <td>${student.lastName}</td>
                <td>${a.checkInTime}</td>
                <td>${a.checkOutTime || '-'}</td>
                <td>${a.duration || '-'}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    document.getElementById('monthlyData').innerHTML = html;
}

// 学生別データ読み込み
function loadStudentsData() {
    const attendance = JSON.parse(localStorage.getItem('attendance') || '[]');
    const students = JSON.parse(localStorage.getItem('students') || '[]');
    
    const schoolStudents = students.filter(s => s.schoolId === currentSchool.id);
    
    if (schoolStudents.length === 0) {
        document.getElementById('studentsData').innerHTML = '<p style="color: #666;">登録されている学生がいません</p>';
        return;
    }
    
    let html = '<table><thead><tr><th>学生番号</th><th>名前</th><th>登録日</th><th>出席日数</th><th>総滞在時間</th></tr></thead><tbody>';
    
    schoolStudents.forEach(student => {
        const studentAttendance = attendance.filter(a => a.studentId === student.id);
        const attendanceDays = studentAttendance.length;
        
        let totalMinutes = 0;
        studentAttendance.forEach(a => {
            if (a.duration) {
                const match = a.duration.match(/(\d+)時間(\d+)分/);
                if (match) {
                    totalMinutes += parseInt(match[1]) * 60 + parseInt(match[2]);
                }
            }
        });
        
        const totalHours = Math.floor(totalMinutes / 60);
        const remainingMinutes = totalMinutes % 60;
        const totalDuration = `${totalHours}時間${remainingMinutes}分`;
        
        html += `
            <tr>
                <td>${student.studentNumber}</td>
                <td>${student.lastName}</td>
                <td>${student.registrationDate}</td>
                <td>${attendanceDays}日</td>
                <td>${totalDuration}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    document.getElementById('studentsData').innerHTML = html;
}

// 19時自動下校処理（学校用）
function processSchoolAutoCheckout() {
    const attendance = JSON.parse(localStorage.getItem('attendance') || '[]');
    const students = JSON.parse(localStorage.getItem('students') || '[]');
    const today = new Date().toISOString().split('T')[0];
    
    const studentMap = {};
    students.forEach(s => {
        studentMap[s.id] = s;
    });
    
    let processedCount = 0;
    const processedStudents = [];
    
    attendance.forEach(record => {
        if (record.checkInDate === today && 
            !record.checkOutTime && 
            record.schoolId === currentSchool.id) {
            
            record.checkOutTime = '19:00:00';
            
            const checkIn = new Date(`${today} ${record.checkInTime}`);
            const checkOut = new Date(`${today} 19:00:00`);
            const duration = Math.floor((checkOut - checkIn) / 1000 / 60);
            record.duration = `${Math.floor(duration / 60)}時間${duration % 60}分`;
            
            const student = studentMap[record.studentId];
            if (student) {
                processedStudents.push(student.lastName);
            }
            processedCount++;
        }
    });
    
    localStorage.setItem('attendance', JSON.stringify(attendance));
    
    const resultDiv = document.getElementById('schoolAutoCheckoutResult');
    if (processedCount > 0) {
        resultDiv.innerHTML = `
            <div style="background: #d4edda; color: #155724; padding: 1rem; border-radius: 4px;">
                ✅ ${processedCount}名を19:00で下校処理しました<br>
                ${processedStudents.join('、')}
            </div>
        `;
    } else {
        resultDiv.innerHTML = `
            <div style="background: #fff3cd; color: #856404; padding: 1rem; border-radius: 4px;">
                ℹ️ 本日の未下校者はいません
            </div>
        `;
    }
    
    loadTodayData();
}

// データエクスポート（学校用）
function exportSchoolData() {
    const data = {
        users: JSON.parse(localStorage.getItem('users') || '[]'),
        schools: JSON.parse(localStorage.getItem('schools') || '[]'),
        students: JSON.parse(localStorage.getItem('students') || '[]'),
        attendance: JSON.parse(localStorage.getItem('attendance') || '[]'),
        exportDate: new Date().toISOString(),
        exportSchool: currentSchool.name
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `school_data_${currentSchool.name}_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    
    alert('データをエクスポートしました');
}

// データインポート（学校用）
function importSchoolData() {
    const fileInput = document.getElementById('schoolImportFile');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('ファイルを選択してください');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            if (confirm('現在のデータが上書きされます。よろしいですか？')) {
                localStorage.setItem('users', JSON.stringify(data.users || []));
                localStorage.setItem('schools', JSON.stringify(data.schools || []));
                localStorage.setItem('students', JSON.stringify(data.students || []));
                localStorage.setItem('attendance', JSON.stringify(data.attendance || []));
                
                const resultDiv = document.getElementById('schoolImportResult');
                resultDiv.innerHTML = `
                    <div style="background: #d4edda; color: #155724; padding: 1rem; border-radius: 4px;">
                        ✅ データをインポートしました<br>
                        インポート元: ${data.exportSchool || '不明'}<br>
                        エクスポート日時: ${data.exportDate || '不明'}
                    </div>
                `;
                
                loadTodayData();
                loadMonthlyData();
                loadStudentsData();
            }
        } catch (error) {
            alert('ファイルの読み込みに失敗しました: ' + error.message);
        }
    };
    reader.readAsText(file);
}
