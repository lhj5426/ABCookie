@echo off
echo 📦 正在创建Chrome扩展发布包...
echo.

:: 检查是否存在旧的发布包
if exist "cookie-profile-switcher-v1.2.0.zip" (
    echo 🔄 删除旧版本...
    del "cookie-profile-switcher-v1.2.0.zip"
)

:: 创建临时目录
if exist "temp_package" (
    rmdir /s /q "temp_package"
)
mkdir "temp_package"

:: 复制必需文件
echo 📋 复制必需文件...
copy "manifest.json" "temp_package\"
copy "background.js" "temp_package\"
copy "popup.html" "temp_package\"
copy "popup.js" "temp_package\"
copy "popup.css" "temp_package\"

:: 复制多语言文件夹
echo 🌐 复制多语言文件...
xcopy "_locales" "temp_package\_locales" /s /i /q

:: 复制图标文件夹（仅PNG文件）
echo 🎨 复制图标文件...
mkdir "temp_package\icons"
copy "icons\*.png" "temp_package\icons\"

:: 使用PowerShell创建ZIP文件
echo 📦 创建ZIP压缩包...
powershell -command "Compress-Archive -Path 'temp_package\*' -DestinationPath 'cookie-profile-switcher-v1.2.0.zip' -Force"

:: 清理临时文件
echo 🧹 清理临时文件...
rmdir /s /q "temp_package"

echo.
echo ✅ 打包完成！
echo 📦 发布包：cookie-profile-switcher-v1.2.0.zip
echo 📁 文件大小：
dir "cookie-profile-switcher-v1.2.0.zip" | findstr ".zip"
echo.
echo 🎯 下一步：
echo 1. 访问 https://chrome.google.com/webstore/devconsole
echo 2. 登录Google账户并注册开发者账户（$5 USD）
echo 3. 上传 cookie-profile-switcher-v1.2.0.zip 文件
echo 4. 按照发布指南.md完成商店信息填写
echo.
pause 