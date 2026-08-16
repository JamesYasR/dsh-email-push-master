# dsh-email-push-master

[English](README.md) | 涓枃

**浣犱笉鍦ㄧ數鑴戝墠鏃讹紝agent 鐢ㄩ偖浠舵彁閱掍綘鍥炴潵銆?*

浣犲湪 [DSH](https://github.com/deepseek-ai)锛堟垨鍏朵粬 AI 缂栫爜 agent锛夐噷娲句竴涓暱浠诲姟 goal锛岀劧鍚庣寮€鐢佃剳銆傚綋 agent 瀹屾垚銆佸崱浣忋€佹垨闇€瑕佷綘鍐崇瓥鏃讹紝瀹冨彂涓€灏侀偖浠跺埌浣犳墜鏈洪偖绠扁€斺€斾綘鐪嬪埌灏卞洖鏉ャ€傚崟鍚戦€氱煡锛屼笉鍋氳繙绋嬫寚鎸ャ€?

## 鏉ユ簮涓庝慨澶?

鏈」鐩槸 [dsh-notify-skill](https://github.com/PAKIKNOWLEDGE/dsh-notify-skill) 鐨?fork锛圡IT 寮€婧愶級锛屽仛浜嗙ǔ瀹氭€у姞鍥猴細

- 鍘绘帀 `535` 鑷姩閲嶈瘯锛堟棫鐗堜細鎶婅处鍙疯秺璇曡秺閿侊級銆佷慨澶?`subject`/`text` 宕╂簝锛?
- 鏂板杩炴帴/绌洪棽瓒呮椂銆乣--check` 鑷銆佺粨鏋勫寲閿欒鍒嗙被銆佸畬鏁撮偖浠跺ご銆?

璇﹁ [CHANGELOG.md](CHANGELOG.md)銆?

## 璁捐鐞嗗康锛氳嚜甯﹀彂閫佸櫒锛岄伩鍏嶆墜鍐欏厹搴?

鏈?skill 鎵撳寘**涓€涓浂渚濊禆瀹炵幇**鈥斺€擿sender.mjs`锛堝彧鐢?Node 鍐呯疆 `tls`/`net`锛夛紝璁?agent 鍦ㄦ瘡涓甯?DSH 浼氳瘽閲岄兘鑳界‘瀹氬湴鍙戜俊锛圖SH 鏈韩灏辫窇鍦?Node 涓婏級銆傚彂閫佸櫒鍐呯疆锛氳繛鎺?绌洪棽瓒呮椂銆佺粨鏋勫寲閿欒鍒嗙被锛坄535`/`550`/缃戠粶锛夈€?*535 缁濅笉閲嶈瘯**锛堥伩鍏嶈Е鍙戣处鍙烽鎺э級銆佸畬鏁撮偖浠跺ご銆俙SKILL.md` 浠嶇劧鎵胯浇瀹屾暣濂戠害锛?

- **浣曟椂**閫氱煡锛坓oal 瀹屾垚 / 闃诲 / 鎻愰棶鍐崇瓥鍓?/ 闀夸换鍔¤妭鐐癸級锛?
- **鍐欎粈涔?*锛堝叿浣撱€佺敤浣犵殑璇█銆佺畝鐭級锛?
- **閰嶇疆濂戠害**锛坄config.json`锛氬彂浠堕偖绠便€丼MTP 鎺堟潈鐮併€佹敹浠堕偖绠憋紱QQ/163 閭鑷姩鎺ㄦ柇鏈嶅姟鍣級锛?
- 閰嶇疆缂哄け鏃跺浣?*寮曞鐢ㄦ埛**鑾峰彇 SMTP 鎺堟潈鐮侊紝
- 鏁呴殰澶勭悊涓庡畨鍏ㄨ鍒欍€?

涓囦竴 Node 鐪熺殑涓嶅彲鐢紙鏋佸皯瑙侊級锛宎gent 搴旇鍋滀笅鏉ュ憡璇夌敤鎴凤紝鑰屼笉鏄墜鍐?SMTP锛涙墜鍐?SMTP 姝ｆ槸闂存瓏鎬?`535` 璁よ瘉澶辫触鐨勪富瑕佹潵婧愩€?

## 瑙﹀彂鏃舵満

| 鏃舵満 | 寤鸿鏍囪 |
|---|---|
| goal 瀹屾垚 | `done` |
| goal 闃诲/鍗′綇 | `block` |
| 鍗冲皢鍚戜綘鎻愰棶鍐崇瓥鏃?| `question` |
| 闀夸换鍔″叧閿妭鐐?| `info` |

agent 蹇呴』閫氳繃鑷甫鐨勫彂閫佸櫒鍙戜俊锛堜笉瑕佽嚜宸辨墜鍐?SMTP锛夛細

```bash
node sender.mjs "鏍囬" "姝ｆ枃"          # 璇诲彇鏃佽竟鐨?config.json 骞跺彂閫?
node sender.mjs --check               # 鍙獙璇侀厤缃?+ SMTP 璁よ瘉锛屼笉鐪熸鍙戜俊
```

> 缁忛獙澶囨敞锛圵indows锛夛細.NET `SmtpClient` 鍦?465 闅愬紡 TLS 涓婃湁宸茬煡鎸傝捣闂鈥斺€旇嚜甯﹀彂閫佸櫒鏀圭敤 `node:tls`锛屾棤姝ら棶棰樸€?

## 瀹夎锛圖SH锛?

**鎻掍欢瀹夎锛堟帹鑽愶級** 鈥斺€?鏈?skill 浠?DSH 鎻掍欢褰㈠紡鍙戝竷锛岃嚜鍔ㄦ敞鍐屽埌 `ctx.skills`锛?

```bash
dsh plugin --profile web add dsh-email-push-master
```

鎴栫敤 GitHub 婧愶細`dsh plugin --profile web add github:JamesYasR/dsh-email-push-master`銆傝瀹岄噸鍚竴娆?`dsh web`锛屼細璇?skill 鐩綍閲屽氨浼氬嚭鐜板畠銆?

**鎵嬪姩瀹夎锛堜笉瑁呮彃浠讹級** 鈥斺€?DSH 涔熶細浠?`<dshHome>/skills/<name>/SKILL.md` 鍙戠幇 skill锛堥粯璁?`~/.dsh/skills`锛夛紝鏂囦欢鐩戣鍣ㄧ儹鍔犺浇锛?

```bash
git clone https://github.com/JamesYasR/dsh-email-push-master.git "$HOME/.dsh/skills/notify"
```

涔熷彲浠ユ墜鍔ㄦ妸鏂囦欢澶瑰鍒跺埌 `~/.dsh/skills/notify/`銆傛柊浼氳瘽绔嬪嵆鐢熸晥銆?

## 閰嶇疆锛堜竴娆℃€э紝绾?5 鍒嗛挓锛?

鐩存帴璁?agent 鐢ㄨ繖涓?skill锛屽畠涔熶細寮曞浣犲畬鎴愩€?

1. 鑾峰彇 SMTP **鎺堟潈鐮?*锛堜笉鏄櫥褰曞瘑鐮侊級锛?
   - **QQ 閭**锛氱綉椤电増 鈫?璁剧疆 鈫?璐︽埛 鈫?寮€鍚€孭OP3/SMTP 鏈嶅姟銆嶁啋 鐢熸垚 **16 浣嶆巿鏉冪爜**
   - **163 閭**锛氱綉椤电増 鈫?璁剧疆 鈫?POP3/SMTP/IMAP/SMTP 鈫?寮€鍚?鈫?鏂板鎺堟潈鐮?
2. 澶嶅埗 `config.example.json` 涓?`config.json` 骞跺～鍐欙細
   ```json
   {
     "email": {
       "smtpHost": "",
       "smtpPort": 465,
       "useSsl": true,
       "from": "your-address@qq.com",
       "authCode": "16浣嶆巿鏉冪爜",
       "to": "recipient@example.com"
     }
   }
   ```
   `smtpHost` 鍙暀绌猴紝鎸夊湴鍧€鑷姩鎺ㄦ柇锛坄@qq.com` 鈫?`smtp.qq.com`锛宍@163.com` 鈫?`smtp.163.com`锛?65 SSL锛夈€?
3. 娴嬭瘯锛氳 agent 鍙戜竴鏉℃祴璇曢€氱煡鍗冲彲锛堝畠浼氳皟鐢ㄨ嚜甯︾殑鍙戦€佸櫒锛夈€?

## 鍏朵粬 agent锛圕laude Code銆丆odex 绛夛級

鏃犻渶浠讳綍鍏煎宸ヤ綔鈥斺€旂幇鍦ㄧ殑 agent 寰堣仾鏄庯紝鎶?`SKILL.md` 鍜岄厤缃绾︽寚缁欏畠锛涜瀹冧娇鐢ㄨ嚜甯︾殑鍙戦€佸櫒锛屼笉瑕侀噸鏂板疄鐜?SMTP銆?

## 瀹夊叏

- `config.json`锛堝惈浣犵殑 SMTP 鎺堟潈鐮侊級鍜?`notify.log` 宸?**gitignore**鈥斺€旂粷涓嶈寮烘帹鍏ュ簱銆傛巿鏉冪爜娉勯湶绛変簬鍒汉鑳界敤浣犵殑閭鍙戜俊銆?
- skill 鎸囦护瑕佹眰 agent 缁濅笉鎵撳嵃鎴栨彁浜ゆ巿鏉冪爜銆?

## License

[MIT](LICENSE)


## 蹇€熷紑濮?
```sh
dsh plugin --profile web add github:JamesYasR/dsh-email-push-master
```

瑁呭畬閲嶅惎 `dsh web`锛屽埌 **璁剧疆 鈫?鎻掍欢 鈫?閭欢鎺ㄩ€?* 閲屽～鍐欐湇鍔″晢 / 鍙戦€佹湇鍔″櫒 / 鍙戜欢閭 / 瀵嗛挜 / 鏀朵欢閭鍗冲彲锛涗篃鍙敤 `node sender.mjs --check` 鍋氳璇佽嚜妫€銆?