// auth.js - 認証処理

// システム初期化
function initializeSystem() {
    // 既存データがあればスキップ
    if (localStorage.getItem('systemInitialized')) {
        return;
    }

    // デフォルトの総管理者を作成
    const defaultAdmin = {
        id: 'USR001',
        name: '総管理者',
        email: 'admin@system.com',
        role: 'super_admin',
        password: 'admin123', // デフォルトパスワード
        createdAt: new Date().toISOString()
    };

    localStorage.setItem('users', JSON.stringify([defaultAdmin]));
    localStorage.setItem('schools', JSON.stringify([]));
    localStorage.setItem('students', JSON.stringify([]));
    localStorage.setItem('attendance', JSON.stringify([]));
    localStorage.setItem('systemInitialized', 'true');
}

// ページ読み込み時にシステム初期化
initializeSystem();

// ログインフォーム処理
document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const loginId = document.getElementById('loginId').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('errorMessage');
    
    // 管理者ログイン確認
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find(u => u.email === loginId);
    
    if (user) {
        // パスワード未設定の場合
        if (!user.password) {
            localStorage.setItem('tempUser', JSON.stringify(user));
            window.location.href = 'set-password.html';
            return;
        }
        
        // パスワード確認
        if (user.password === password) {
            localStorage.setItem('currentUser', JSON.stringify(user));
            window.location.href = 'dashboard.html';
            return;
        }
    }
    
    // 学校ログイン確認
    const schools = JSON.parse(localStorage.getItem('schools') || '[]');
    const school = schools.find(s => s.loginId === loginId && s.password === password);
    
    if (school) {
        localStorage.setItem('currentSchool', JSON.stringify(school));
        window.location.href = 'school-dashboard.html';
        return;
    }
    
    // ログイン失敗
    errorMessage.textContent = 'ログインIDまたはパスワードが正しくありません';
    errorMessage.classList.add('show');
});