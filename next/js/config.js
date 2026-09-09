// Supabase 连接信息。publishable key 本来就是给浏览器用的公开密钥，
// 数据库那边只给匿名角色开了 select 和 insert，拿到这个 key 也删改不了数据。
window.UM_CONFIG = {
  SUPABASE_URL: 'https://lhdgoofzgkrqetjbnowg.supabase.co',
  SUPABASE_KEY: 'sb_publishable_ppZKKkZLKYPp7UayRaOZyQ_P20-Zfyi',
};
