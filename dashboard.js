// dashboard.js - 管理者ダッシュボードの機能

// 認証チェック
function checkAuth() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'super_admin')) {
        window.location.replace('index.html');
        return null;
    }
    return currentUser;
}

// 初期化
let currentUser = checkAuth();
if (currentUser) {
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('userRole').textContent = currentUser.role === 'super_admin' ? '総管理者' : '管理者';
    
    // 管理者追加ボタンの表示制御（総管理者のみ）
    if (currentUser.role !== 'super_admin') {
        const addAdminBtn = document.getElementById('addAdminBtn');
        if (addAdminBtn) {
            addAdminBtn.style.display = 'none';
        }
    }
    
    loadDashboard();
}

// ログアウト
function logout() {
    localStorage.removeItem('currentUser');
    // 確実にログイン画面に遷移
    window.location.replace('index.html');
    // フォールバック
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 100);
}

// タブ切り替え
function switchTab(tabName) {
    // すべてのタブを非アクティブに
    document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // 選択されたタブをアクティブに
    event.target.classList.add('active');
    document.getElementById(tabName).classList.add('active');
    
    // データの再読み込み
    if (tabName === 'students') {
        loadStudents();
    } else if (tabName === 'schools') {
        loadSchools();
    } else if (tabName === 'admins') {
        loadAdmins();
    }
}

// ダッシュボードデータ読み込み
function loadDashboard() {
    const students = JSON.parse(localStorage.getItem('students') || '[]');
    const schools = JSON.parse(localStorage.getItem('schools') || '[]');
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const attendance = JSON.parse(localStorage.getItem('attendance') || '[]');
    
    document.getElementById('totalStudents').textContent = students.length;
    document.getElementById('totalSchools').textContent = schools.length;
    document.getElementById('totalAdmins').textContent = users.length;
    
    // 本日の出席数
    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = attendance.filter(a => a.checkInDate === today).length;
    document.getElementById('todayAttendance').textContent = todayAttendance;
    
    loadStudents();
    loadSchools();
    loadAdmins();
}

// 学生一覧読み込み
function loadStudents() {
    const students = JSON.parse(localStorage.getItem('students') || '[]');
    const schools = JSON.parse(localStorage.getItem('schools') || '[]');
    
    const schoolMap = {};
    schools.forEach(school => {
        schoolMap[school.id] = school.name;
    });
    
    let html = '<table><thead><tr><th>学生証番号</th><th>名前</th><th>学校</th><th>登録日</th><th>操作</th></tr></thead><tbody>';
    
    students.forEach(student => {
        html += `
            <tr>
                <td>${student.studentNumber}</td>
                <td>${student.lastName}</td>
                <td>${schoolMap[student.schoolId] || '不明'}</td>
                <td>${student.registrationDate}</td>
                <td class="actions">
                    <button class="btn btn-primary btn-small" onclick="editStudent('${student.id}')">編集</button>
                    <button class="btn btn-secondary btn-small" onclick="viewQRCode('${student.studentNumber}', '${student.lastName}')">QRコード</button>
                    <button class="btn btn-danger btn-small" onclick="deleteStudent('${student.id}')">削除</button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    document.getElementById('studentsTable').innerHTML = html;
}

// 学校一覧読み込み
function loadSchools() {
    const schools = JSON.parse(localStorage.getItem('schools') || '[]');
    
    let html = '<table><thead><tr><th>学校名</th><th>ログインID</th><th>パスワード</th><th>登録日</th><th>操作</th></tr></thead><tbody>';
    
    schools.forEach(school => {
        html += `
            <tr>
                <td>${school.name}</td>
                <td>${school.loginId}</td>
                <td class="password-display">※※※※</td>
                <td>${school.createdAt ? new Date(school.createdAt).toLocaleDateString('ja-JP') : '-'}</td>
                <td class="actions">
                    <button class="btn btn-primary btn-small" onclick="editSchool('${school.id}')">編集</button>
                    <button class="btn btn-danger btn-small" onclick="deleteSchool('${school.id}')">削除</button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    document.getElementById('schoolsTable').innerHTML = html;
}

// 管理者一覧読み込み
function loadAdmins() {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    
    let html = '<table><thead><tr><th>名前</th><th>メールアドレス</th><th>役割</th><th>登録日</th><th>操作</th></tr></thead><tbody>';
    
    users.forEach(user => {
        const roleText = user.role === 'super_admin' ? '総管理者' : '管理者';
        
        // admin@system.com と自分自身は削除ボタンを非表示
        const showDeleteBtn = user.email !== 'admin@system.com' && user.id !== currentUser.id;
        const deleteBtn = showDeleteBtn 
            ? `<button class="btn btn-danger btn-small" onclick="deleteAdmin('${user.id}')">削除</button>`
            : '';
        
        html += `
            <tr>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>${roleText}</td>
                <td>${user.createdAt ? new Date(user.createdAt).toLocaleDateString('ja-JP') : '-'}</td>
                <td class="actions">
                    ${deleteBtn}
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    document.getElementById('adminsTable').innerHTML = html;
}

// モーダル表示
function showModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    // フォームのリセット
    const form = document.getElementById(modalId.replace('Modal', 'Form'));
    if (form) form.reset();
}

// 学生追加モーダル
function showAddStudentModal() {
    document.getElementById('studentModalTitle').textContent = '学生を追加';
    document.getElementById('studentForm').reset();
    document.getElementById('studentId').value = '';
    
    // 学校セレクトボックスの設定
    const schools = JSON.parse(localStorage.getItem('schools') || '[]');
    const select = document.getElementById('studentSchool');
    select.innerHTML = '<option value="">選択してください</option>';
    schools.forEach(school => {
        select.innerHTML += `<option value="${school.id}">${school.name}</option>`;
    });
    
    showModal('studentModal');
}

// 学生編集
function editStudent(id) {
    const students = JSON.parse(localStorage.getItem('students') || '[]');
    const student = students.find(s => s.id === id);
    
    if (student) {
        document.getElementById('studentModalTitle').textContent = '学生を編集';
        document.getElementById('studentId').value = student.id;
        document.getElementById('studentLastName').value = student.lastName;
        
        // 学校セレクトボックスの設定
        const schools = JSON.parse(localStorage.getItem('schools') || '[]');
        const select = document.getElementById('studentSchool');
        select.innerHTML = '<option value="">選択してください</option>';
        schools.forEach(school => {
            const selected = school.id === student.schoolId ? 'selected' : '';
            select.innerHTML += `<option value="${school.id}" ${selected}>${school.name}</option>`;
        });
        
        showModal('studentModal');
    }
}

// 学生削除
function deleteStudent(id) {
    if (confirm('この学生を削除してもよろしいですか?')) {
        let students = JSON.parse(localStorage.getItem('students') || '[]');
        students = students.filter(s => s.id !== id);
        localStorage.setItem('students', JSON.stringify(students));
        loadStudents();
        loadDashboard();
    }
}

// 学生フォーム送信
document.getElementById('studentForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const id = document.getElementById('studentId').value;
    const lastName = document.getElementById('studentLastName').value;
    const schoolId = document.getElementById('studentSchool').value;
    
    let students = JSON.parse(localStorage.getItem('students') || '[]');
    
    if (id) {
        // 編集
        const index = students.findIndex(s => s.id === id);
        if (index !== -1) {
            students[index].lastName = lastName;
            students[index].schoolId = schoolId;
            students[index].updatedAt = new Date().toISOString();
        }
    } else {
        // 新規追加
        const newStudent = {
            id: 'STU' + Date.now(),
            registrationDate: new Date().toISOString().split('T')[0],
            studentNumber: 'S' + String(students.length + 1).padStart(6, '0'),
            lastName: lastName,
            schoolId: schoolId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        students.push(newStudent);
    }
    
    localStorage.setItem('students', JSON.stringify(students));
    closeModal('studentModal');
    loadStudents();
    loadDashboard();
});

// 学校追加モーダル
function showAddSchoolModal() {
    document.getElementById('schoolModalTitle').textContent = '学校を追加';
    document.getElementById('schoolForm').reset();
    document.getElementById('schoolId').value = '';
    document.getElementById('schoolPassword').required = true;
    showModal('schoolModal');
}

// 学校編集
function editSchool(id) {
    const schools = JSON.parse(localStorage.getItem('schools') || '[]');
    const school = schools.find(s => s.id === id);
    
    if (school) {
        document.getElementById('schoolModalTitle').textContent = '学校を編集';
        document.getElementById('schoolId').value = school.id;
        document.getElementById('schoolName').value = school.name;
        document.getElementById('schoolLoginId').value = school.loginId;
        document.getElementById('schoolPassword').value = '';
        document.getElementById('schoolPassword').required = false;
        showModal('schoolModal');
    }
}

// 学校削除
function deleteSchool(id) {
    if (confirm('この学校を削除してもよろしいですか?')) {
        let schools = JSON.parse(localStorage.getItem('schools') || '[]');
        schools = schools.filter(s => s.id !== id);
        localStorage.setItem('schools', JSON.stringify(schools));
        loadSchools();
        loadDashboard();
    }
}

// 学校フォーム送信
document.getElementById('schoolForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const id = document.getElementById('schoolId').value;
    const name = document.getElementById('schoolName').value;
    const loginId = document.getElementById('schoolLoginId').value;
    const password = document.getElementById('schoolPassword').value;
    
    let schools = JSON.parse(localStorage.getItem('schools') || '[]');
    
    if (id) {
        // 編集
        const index = schools.findIndex(s => s.id === id);
        if (index !== -1) {
            schools[index].name = name;
            schools[index].loginId = loginId;
            // パスワードが入力されている場合のみ更新
            if (password) {
                schools[index].password = password;
            }
            schools[index].updatedAt = new Date().toISOString();
        }
    } else {
        // 新規追加
        if (!password || password.length < 8) {
            alert('パスワードは8文字以上で入力してください');
            return;
        }
        
        const newSchool = {
            id: 'SCH' + Date.now(),
            name: name,
            loginId: loginId,
            password: password,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        schools.push(newSchool);
    }
    
    localStorage.setItem('schools', JSON.stringify(schools));
    closeModal('schoolModal');
    loadSchools();
    loadDashboard();
});

// 管理者追加モーダル
function showAddAdminModal() {
    if (currentUser.role !== 'super_admin') {
        alert('管理者の追加は総管理者のみ可能です');
        return;
    }
    showModal('adminModal');
}

// 管理者削除
function deleteAdmin(id) {
    if (id === currentUser.id) {
        alert('自分自身は削除できません');
        return;
    }
    
    if (currentUser.role !== 'super_admin') {
        alert('管理者の削除は総管理者のみ可能です');
        return;
    }
    
    // 初期総管理者（admin@system.com）の削除を防止
    let users = JSON.parse(localStorage.getItem('users') || '[]');
    let targetUser = users.find(u => u.id === id);
    if (targetUser && targetUser.email === 'admin@system.com') {
        alert('初期総管理者（admin@system.com）は削除できません');
        return;
    }
    
    if (confirm('この管理者を削除してもよろしいですか?')) {
        users = users.filter(u => u.id !== id);
        localStorage.setItem('users', JSON.stringify(users));
        loadAdmins();
        loadDashboard();
    }
}

// 管理者フォーム送信
document.getElementById('adminForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    if (currentUser.role !== 'super_admin') {
        alert('管理者の追加は総管理者のみ可能です');
        return;
    }
    
    const name = document.getElementById('adminName').value;
    const email = document.getElementById('adminEmail').value;
    const role = document.getElementById('adminRole').value;
    
    let users = JSON.parse(localStorage.getItem('users') || '[]');
    
    // メールアドレスの重複チェック
    if (users.some(u => u.email === email)) {
        alert('このメールアドレスは既に登録されています');
        return;
    }
    
    const newUser = {
        id: 'USR' + Date.now(),
        name: name,
        email: email,
        role: role,
        password: null, // 初回ログイン時に設定
        createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    
    closeModal('adminModal');
    loadAdmins();
    loadDashboard();
    
    alert('管理者を追加しました。初回ログイン時にパスワードを設定してください。');
});

// QRコード表示
function viewQRCode(studentNumber, lastName) {
    window.open(`qrcode.html?number=${studentNumber}&name=${encodeURIComponent(lastName)}`, '_blank');
}

// データエクスポート
// レポート機能 - 新バージョン

// グローバル変数：設定された期間
let reportStartDate = null;
let reportEndDate = null;

// 期間設定
function setPeriod() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if (!startDate || !endDate) {
        alert('開始日と終了日を両方選択してください');
        return;
    }
    
    if (startDate > endDate) {
        alert('開始日は終了日より前の日付を選択してください');
        return;
    }
    
    reportStartDate = startDate;
    reportEndDate = endDate;
    
    // 期間表示を更新
    document.getElementById('periodText').textContent = `${startDate} ～ ${endDate}`;
    document.getElementById('periodDisplay').style.display = 'block';
    document.getElementById('exportButtons').style.display = 'block';
}

// 1. 学生データエクスポート
function exportStudentData() {
    const students = JSON.parse(localStorage.getItem('students') || '[]');
    const schools = JSON.parse(localStorage.getItem('schools') || '[]');
    
    const schoolMap = {};
    schools.forEach(school => {
        schoolMap[school.id] = school.name;
    });
    
    let csv = '\uFEFF'; // BOM for Excel
    csv += '学生証番号,名前,学校,登録日\n';
    
    students.forEach(student => {
        csv += `${student.studentNumber},${student.lastName},${schoolMap[student.schoolId] || ''},${student.registrationDate}\n`;
    });
    
    downloadCSV(csv, '学生データ.csv');
}

// 2. 学校学習データエクスポート
function exportSchoolLearningData() {
    if (!reportStartDate || !reportEndDate) {
        alert('先に期間を設定してください');
        return;
    }
    
    const attendance = JSON.parse(localStorage.getItem('attendance') || '[]');
    const schools = JSON.parse(localStorage.getItem('schools') || '[]');
    
    const schoolMap = {};
    schools.forEach(school => {
        schoolMap[school.id] = school.name;
    });
    
    // 学校×日付ごとに集計
    const schoolDateMap = {};
    
    attendance.forEach(record => {
        if (record.checkInDate >= reportStartDate && record.checkInDate <= reportEndDate) {
            const key = `${record.schoolId}_${record.checkInDate}`;
            
            if (!schoolDateMap[key]) {
                schoolDateMap[key] = {
                    schoolId: record.schoolId,
                    date: record.checkInDate,
                    count: 0,
                    totalMinutes: 0
                };
            }
            
            schoolDateMap[key].count++;
            
            // 学習時間の計算
            if (record.duration) {
                const match = record.duration.match(/(\d+)時間(\d+)分/);
                if (match) {
                    schoolDateMap[key].totalMinutes += parseInt(match[1]) * 60 + parseInt(match[2]);
                }
            }
        }
    });
    
    let csv = '\uFEFF'; // BOM for Excel
    csv += '学校,日付,学習人数,学習時間合計\n';
    
    // 学校名でソート
    const sortedData = Object.values(schoolDateMap).sort((a, b) => {
        if (a.schoolId !== b.schoolId) {
            return schoolMap[a.schoolId].localeCompare(schoolMap[b.schoolId]);
        }
        return a.date.localeCompare(b.date);
    });
    
    sortedData.forEach(data => {
        const hours = Math.floor(data.totalMinutes / 60);
        const minutes = data.totalMinutes % 60;
        const timeStr = `${hours}時間${minutes}分`;
        csv += `${schoolMap[data.schoolId] || ''},${data.date},${data.count},${timeStr}\n`;
    });
    
    downloadCSV(csv, `学校学習データ_${reportStartDate}_${reportEndDate}.csv`);
}

// 3. 学生学習データ（合計）エクスポート
function exportStudentLearningTotal() {
    if (!reportStartDate || !reportEndDate) {
        alert('先に期間を設定してください');
        return;
    }
    
    const attendance = JSON.parse(localStorage.getItem('attendance') || '[]');
    const students = JSON.parse(localStorage.getItem('students') || '[]');
    
    const studentMap = {};
    students.forEach(student => {
        studentMap[student.id] = student;
    });
    
    // 学生ごとに集計
    const studentTotalMap = {};
    
    attendance.forEach(record => {
        if (record.checkInDate >= reportStartDate && record.checkInDate <= reportEndDate) {
            if (!studentTotalMap[record.studentId]) {
                studentTotalMap[record.studentId] = {
                    days: 0,
                    totalMinutes: 0
                };
            }
            
            studentTotalMap[record.studentId].days++;
            
            // 学習時間の計算
            if (record.duration) {
                const match = record.duration.match(/(\d+)時間(\d+)分/);
                if (match) {
                    studentTotalMap[record.studentId].totalMinutes += parseInt(match[1]) * 60 + parseInt(match[2]);
                }
            }
        }
    });
    
    let csv = '\uFEFF'; // BOM for Excel
    csv += '学生証番号,名前,学習日数合計,学習時間合計\n';
    
    // 学生証番号でソート
    const sortedStudents = students.sort((a, b) => a.studentNumber.localeCompare(b.studentNumber));
    
    sortedStudents.forEach(student => {
        const total = studentTotalMap[student.id];
        if (total) {
            const hours = Math.floor(total.totalMinutes / 60);
            const minutes = total.totalMinutes % 60;
            const timeStr = `${hours}時間${minutes}分`;
            csv += `${student.studentNumber},${student.lastName},${total.days},${timeStr}\n`;
        } else {
            csv += `${student.studentNumber},${student.lastName},0,0時間0分\n`;
        }
    });
    
    downloadCSV(csv, `学生学習データ_合計_${reportStartDate}_${reportEndDate}.csv`);
}

// 4. 学生学習データ（個人）エクスポート
function exportStudentLearningDetail() {
    if (!reportStartDate || !reportEndDate) {
        alert('先に期間を設定してください');
        return;
    }
    
    const attendance = JSON.parse(localStorage.getItem('attendance') || '[]');
    const students = JSON.parse(localStorage.getItem('students') || '[]');
    const schools = JSON.parse(localStorage.getItem('schools') || '[]');
    
    const studentMap = {};
    students.forEach(student => {
        studentMap[student.id] = student;
    });
    
    const schoolMap = {};
    schools.forEach(school => {
        schoolMap[school.id] = school.name;
    });
    
    let csv = '\uFEFF'; // BOM for Excel
    csv += '学生証番号,名前,日付,学校,登校時間,下校時間,学習時間合計\n';
    
    // 期間内のデータを抽出してソート
    const filteredRecords = attendance.filter(record => 
        record.checkInDate >= reportStartDate && record.checkInDate <= reportEndDate
    ).sort((a, b) => {
        const studentA = studentMap[a.studentId];
        const studentB = studentMap[b.studentId];
        if (studentA && studentB) {
            if (studentA.studentNumber !== studentB.studentNumber) {
                return studentA.studentNumber.localeCompare(studentB.studentNumber);
            }
        }
        return a.checkInDate.localeCompare(b.checkInDate);
    });
    
    filteredRecords.forEach(record => {
        const student = studentMap[record.studentId];
        if (student) {
            csv += `${student.studentNumber},${student.lastName},${record.checkInDate},${schoolMap[record.schoolId] || ''},${record.checkInTime},${record.checkOutTime || ''},${record.duration || ''}\n`;
        }
    });
    
    downloadCSV(csv, `学生学習データ_個人_${reportStartDate}_${reportEndDate}.csv`);
}

function downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// 日付フィールドの初期化
document.addEventListener('DOMContentLoaded', function() {
    const today = new Date().toISOString().split('T')[0];
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    
    document.getElementById('startDate').value = firstDayOfMonth;
    document.getElementById('endDate').value = today;
});// データ同期機能

// 19時自動下校処理
function processAutoCheckout() {
    const attendance = JSON.parse(localStorage.getItem('attendance') || '[]');
    const students = JSON.parse(localStorage.getItem('students') || '[]');
    const today = new Date().toISOString().split('T')[0];
    const checkoutTime = '19:00:00';
    
    let processedCount = 0;
    const studentMap = {};
    students.forEach(s => studentMap[s.id] = s);
    
    attendance.forEach(record => {
        // 本日の記録で、まだ下校していないもの
        if (record.checkInDate === today && !record.checkOutTime) {
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
        
        const resultDiv = document.getElementById('autoCheckoutResult');
        resultDiv.className = 'alert alert-success';
        resultDiv.innerHTML = `✅ ${processedCount}名の未下校者を19:00で下校処理しました`;
        resultDiv.style.display = 'block';
        
        // 概要タブのデータを更新
        loadDashboard();
    } else {
        const resultDiv = document.getElementById('autoCheckoutResult');
        resultDiv.className = 'alert alert-success';
        resultDiv.innerHTML = `ℹ️ 本日の未下校者はいません`;
        resultDiv.style.display = 'block';
    }
    
    // 3秒後にメッセージを消す
    setTimeout(() => {
        const resultDiv = document.getElementById('autoCheckoutResult');
        if (resultDiv) resultDiv.style.display = 'none';
    }, 5000);
}

// 全データエクスポート
function exportAllData() {
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
    link.download = `学習管理システムデータ_${timestamp}.json`;
    link.href = url;
    link.click();
    
    URL.revokeObjectURL(url);
    
    alert('✅ データをエクスポートしました！\n\nファイルをiPad/パソコンに転送して、インポート機能で読み込んでください。');
}

// 全データインポート
function importAllData() {
    const fileInput = document.getElementById('importFile');
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
            
            const resultDiv = document.getElementById('importResult');
            resultDiv.className = 'alert alert-success';
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
            const resultDiv = document.getElementById('importResult');
            resultDiv.className = 'alert alert-error';
            resultDiv.innerHTML = `❌ データのインポートに失敗しました<br>エラー: ${error.message}`;
            resultDiv.style.display = 'block';
        }
    };
    
    reader.onerror = function() {
        const resultDiv = document.getElementById('importResult');
        resultDiv.className = 'alert alert-error';
        resultDiv.innerHTML = `❌ ファイルの読み込みに失敗しました`;
        resultDiv.style.display = 'block';
    };
    
    reader.readAsText(file);
}
