// school-dashboard.js - 学校管理画面の機能

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
    localStorage.removeItem('currentSchool');
    // 確実にログイン画面に遷移
    window.location.replace('index.html');
    // フォールバック
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 100);
}

// QRスキャナー初期化
function initScanner() {
    const html5QrCode = new Html5Qrcode("reader");
    
    html5QrCode.start(
        { facingMode: "environment" },
        {
            fps: 10,
            qrbox: { width: 250, height: 250 }
        },
        onScanSuccess,
        onScanError
    ).catch(err => {
        console.error("カメラの起動に失敗しました:", err);
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
    
    processAttendance(student);
}

function onScanError(error) {
    // エラーは無視（スキャン中は常にエラーが発生するため）
}

// 出席処理
function processAttendance(student) {
    const attendance = JSON.parse(localStorage.getItem('attendance') || '[]');
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const currentTime = now.toTimeString().split(' ')[0];
    
    // 本日の出席記録を確認
    const todayRecord = attendance.find(a => 
        a.studentId === student.id && 
        a.checkInDate === today
    );
    
    if (!todayRecord) {
        // 登校処理
        const newRecord = {
            id: 'ATT' + Date.now(),
            studentId: student.id,
            schoolId: currentSchool.id,
            checkInDate: today,
            checkInTime: currentTime,
            checkOutTime: null,
            duration: null
        };
        attendance.push(newRecord);
        localStorage.setItem('attendance', JSON.stringify(attendance));
        showMessage(`${student.lastName} さんが登校しました`, true);
    } else if (!todayRecord.checkOutTime) {
        // 下校処理
        todayRecord.checkOutTime = currentTime;
        
        // 滞在時間を計算
        const checkIn = new Date(`${today} ${todayRecord.checkInTime}`);
        const checkOut = new Date(`${today} ${currentTime}`);
        const duration = Math.floor((checkOut - checkIn) / 1000 / 60); // 分単位
        todayRecord.duration = `${Math.floor(duration / 60)}時間${duration % 60}分`;
        
        localStorage.setItem('attendance', JSON.stringify(attendance));
        showMessage(`${student.lastName} さんが下校しました（滞在時間: ${todayRecord.duration}）`, true);
    } else {
        showMessage(`${student.lastName} さんは既に下校済みです`, false);
    }
    
    loadTodayData();
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
    
    const todayRecords = attendance.filter(a => 
        a.schoolId === currentSchool.id && 
        a.checkInDate === today
    );
    
    let html = '<table><thead><tr><th>学生証番号</th><th>名前</th><th>登校時刻</th><th>下校時刻</th><th>滞在時間</th><th>状態</th></tr></thead><tbody>';
    
    if (todayRecords.length === 0) {
        html += '<tr><td colspan="6" style="text-align: center; color: #999;">本日の出席記録はありません</td></tr>';
    } else {
        todayRecords.forEach(record => {
            const student = studentMap[record.studentId];
            if (student) {
                const status = record.checkOutTime 
                    ? '<span class="status-badge out">下校済み</span>' 
                    : '<span class="status-badge in">在校中</span>';
                
                html += `
                    <tr>
                        <td>${student.studentNumber}</td>
                        <td>${student.lastName}</td>
                        <td>${record.checkInTime}</td>
                        <td>${record.checkOutTime || '-'}</td>
                        <td>${record.duration || '-'}</td>
                        <td>${status}</td>
                    </tr>
                `;
            }
        });
    }
    
    html += '</tbody></table>';
    document.getElementById('todayData').innerHTML = html;
}

// 月別データ読み込み
function loadMonthlyData() {
    const attendance = JSON.parse(localStorage.getItem('attendance') || '[]');
    const students = JSON.parse(localStorage.getItem('students') || '[]');
    
    const monthFilter = document.getElementById('monthFilter');
    if (!monthFilter.value) {
        const today = new Date();
        monthFilter.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    }
    
    const targetMonth = monthFilter.value;
    
    const studentMap = {};
    students.forEach(s => {
        studentMap[s.id] = s;
    });
    
    const monthlyRecords = attendance.filter(a => 
        a.schoolId === currentSchool.id && 
        a.checkInDate.startsWith(targetMonth)
    );
    
    let html = '<table><thead><tr><th>日付</th><th>学生証番号</th><th>名前</th><th>登校時刻</th><th>下校時刻</th><th>滞在時間</th></tr></thead><tbody>';
    
    if (monthlyRecords.length === 0) {
        html += '<tr><td colspan="6" style="text-align: center; color: #999;">この月の出席記録はありません</td></tr>';
    } else {
        monthlyRecords.forEach(record => {
            const student = studentMap[record.studentId];
            if (student) {
                html += `
                    <tr>
                        <td>${record.checkInDate}</td>
                        <td>${student.studentNumber}</td>
                        <td>${student.lastName}</td>
                        <td>${record.checkInTime}</td>
                        <td>${record.checkOutTime || '-'}</td>
                        <td>${record.duration || '-'}</td>
                    </tr>
                `;
            }
        });
    }
    
    html += '</tbody></table>';
    document.getElementById('monthlyData').innerHTML = html;
}

// 学生別データ読み込み
function loadStudentsData() {
    const attendance = JSON.parse(localStorage.getItem('attendance') || '[]');
    const students = JSON.parse(localStorage.getItem('students') || '[]');
    
    const schoolStudents = students.filter(s => s.schoolId === currentSchool.id);
    
    let html = '<table><thead><tr><th>学生証番号</th><th>名前</th><th>総出席日数</th><th>平均滞在時間</th></tr></thead><tbody>';
    
    schoolStudents.forEach(student => {
        const studentRecords = attendance.filter(a => a.studentId === student.id);
        const totalDays = studentRecords.length;
        
        let totalMinutes = 0;
        let completedDays = 0;
        studentRecords.forEach(record => {
            if (record.duration) {
                const match = record.duration.match(/(\d+)時間(\d+)分/);
                if (match) {
                    totalMinutes += parseInt(match[1]) * 60 + parseInt(match[2]);
                    completedDays++;
                }
            }
        });
        
        const avgMinutes = completedDays > 0 ? Math.floor(totalMinutes / completedDays) : 0;
        const avgDuration = `${Math.floor(avgMinutes / 60)}時間${avgMinutes % 60}分`;
        
        html += `
            <tr>
                <td>${student.studentNumber}</td>
                <td>${student.lastName}</td>
                <td>${totalDays}日</td>
                <td>${completedDays > 0 ? avgDuration : '-'}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    document.getElementById('studentsData').innerHTML = html;
}
// 学校側データ同期機能

// 19時自動下校処理（学校用）
function processSchoolAutoCheckout() {
    const attendance = JSON.parse(localStorage.getItem('attendance') || '[]');
    const students = JSON.parse(localStorage.getItem('students') || '[]');
    const today = new Date().toISOString().split('T')[0];
    const checkoutTime = '19:00:00';
    
    let processedCount = 0;
    const studentMap = {};
    students.forEach(s => studentMap[s.id] = s);
    
    attendance.forEach(record => {
        // 本校の本日の記録で、まだ下校していないもの
        if (record.schoolId === currentSchool.id && 
            record.checkInDate === today && 
            !record.checkOutTime) {
            
            record.checkOutTime = checkoutTime;
            
            // 滞在時間を計算
            const checkIn = new Date(`${today} ${record.checkInTime}`);
            const checkOut = new Date(`${today} ${checkoutTime}`);
            const duration = Math.floor((checkOut - checkIn) / 1000 / 60); // 分単位
            record.duration = `${Math.floor(duration / 60)}時間${duration % 60}分`;
            
            processedCount++;
        }
    });
    
    if (processedCount > 0) {
        localStorage.setItem('attendance', JSON.stringify(attendance));
        
        const resultDiv = document.getElementById('schoolAutoCheckoutResult');
        resultDiv.style.background = '#d4edda';
        resultDiv.style.color = '#155724';
        resultDiv.style.padding = '1rem';
        resultDiv.style.borderRadius = '4px';
        resultDiv.innerHTML = `✅ ${processedCount}名の未下校者を19:00で下校処理しました`;
        resultDiv.style.display = 'block';
        
        // 本日のデータを更新
        loadTodayData();
    } else {
        const resultDiv = document.getElementById('schoolAutoCheckoutResult');
        resultDiv.style.background = '#e7f3ff';
        resultDiv.style.color = '#004085';
        resultDiv.style.padding = '1rem';
        resultDiv.style.borderRadius = '4px';
        resultDiv.innerHTML = `ℹ️ 本日の未下校者はいません`;
        resultDiv.style.display = 'block';
    }
    
    // 5秒後にメッセージを消す
    setTimeout(() => {
        const resultDiv = document.getElementById('schoolAutoCheckoutResult');
        if (resultDiv) resultDiv.style.display = 'none';
    }, 5000);
}

// 全データエクスポート（学校用）
function exportSchoolData() {
    const allData = {
        version: '2.1',
        exportDate: new Date().toISOString(),
        students: JSON.parse(localStorage.getItem('students') || '[]'),
        schools: JSON.parse(localStorage.getItem('schools') || '[]'),
        users: JSON.parse(localStorage.getItem('users') || '[]'),
        attendance: JSON.parse(localStorage.getItem('attendance') || '[]'),
        systemInitialized: localStorage.getItem('systemInitialized')
    };
    
    const jsonStr = JSON.stringify(allData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    link.download = `学習管理システムデータ_${currentSchool.name}_${timestamp}.json`;
    link.href = url;
    link.click();
    
    URL.revokeObjectURL(url);
    
    alert('✅ データをエクスポートしました！\n\nファイルをパソコンに転送して、管理者画面でインポートしてください。');
}

// 全データインポート（学校用）
function importSchoolData() {
    const fileInput = document.getElementById('schoolImportFile');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('❌ ファイルを選択してください');
        return;
    }
    
    if (!file.name.endsWith('.json')) {
        alert('❌ JSONファイルを選択してください');
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            // データの検証
            if (!data.students || !data.schools || !data.users || !data.attendance) {
                throw new Error('無効なデータ形式です');
            }
            
            // 確認ダイアログ
            const confirmMsg = `以下のデータをインポートします：\n\n` +
                `・学生: ${data.students.length}名\n` +
                `・学校: ${data.schools.length}校\n` +
                `・管理者: ${data.users.length}名\n` +
                `・出席記録: ${data.attendance.length}件\n` +
                `・エクスポート日時: ${new Date(data.exportDate).toLocaleString('ja-JP')}\n\n` +
                `現在のデータは上書きされます。よろしいですか？`;
            
            if (!confirm(confirmMsg)) {
                return;
            }
            
            // データを保存
            localStorage.setItem('students', JSON.stringify(data.students));
            localStorage.setItem('schools', JSON.stringify(data.schools));
            localStorage.setItem('users', JSON.stringify(data.users));
            localStorage.setItem('attendance', JSON.stringify(data.attendance));
            localStorage.setItem('systemInitialized', data.systemInitialized || 'true');
            
            const resultDiv = document.getElementById('schoolImportResult');
            resultDiv.style.background = '#d4edda';
            resultDiv.style.color = '#155724';
            resultDiv.style.padding = '1rem';
            resultDiv.style.borderRadius = '4px';
            resultDiv.innerHTML = `✅ データのインポートが完了しました！<br>` +
                `学生: ${data.students.length}名、学校: ${data.schools.length}校、` +
                `管理者: ${data.users.length}名、出席記録: ${data.attendance.length}件<br><br>` +
                `<strong>3秒後にページを再読み込みします...</strong>`;
            resultDiv.style.display = 'block';
            
            // ファイル入力をクリア
            fileInput.value = '';
            
            // 3秒後にページをリロード
            setTimeout(() => {
                location.reload();
            }, 3000);
            
        } catch (error) {
            const resultDiv = document.getElementById('schoolImportResult');
            resultDiv.style.background = '#f8d7da';
            resultDiv.style.color = '#721c24';
            resultDiv.style.padding = '1rem';
            resultDiv.style.borderRadius = '4px';
            resultDiv.innerHTML = `❌ データのインポートに失敗しました<br>エラー: ${error.message}`;
            resultDiv.style.display = 'block';
        }
    };
    
    reader.onerror = function() {
        const resultDiv = document.getElementById('schoolImportResult');
        resultDiv.style.background = '#f8d7da';
        resultDiv.style.color = '#721c24';
        resultDiv.style.padding = '1rem';
        resultDiv.style.borderRadius = '4px';
        resultDiv.innerHTML = `❌ ファイルの読み込みに失敗しました`;
        resultDiv.style.display = 'block';
    };
    
    reader.readAsText(file);
}
