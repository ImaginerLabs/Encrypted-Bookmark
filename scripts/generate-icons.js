/**
 * 图标生成脚本
 * 由于 Node.js 环境限制，这里提供基于浏览器的生成方法
 * 
 * 使用方法：
 * 1. 在浏览器控制台中运行此代码
 * 2. 或者使用在线工具生成图标
 */

function generateIcon(size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  // 绘制背景
  ctx.fillStyle = '#4a90e2';
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, size * 0.15);
  ctx.fill();
  
  // 绘制锁图标
  ctx.fillStyle = 'white';
  ctx.font = `${size * 0.6}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🔐', size / 2, size / 2);
  
  // 下载
  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `icon${size}.png`;
    a.click();
  });
}

// 在浏览器控制台运行：
// generateIcon(16);
// generateIcon(32);
// generateIcon(48);
// generateIcon(128);

// 导出函数以供使用
if (typeof window !== 'undefined') {
  window.generateIcon = generateIcon;
  console.log('图标生成函数已加载，请运行：generateIcon(16/32/48/128)');
}
