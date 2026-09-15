#!/usr/bin/env bash
# =============================================================================
# 开放获取(OA)全文批量下载 —— 长江文化 × 游戏化文化传播 × AI文化IP 文献库 v1.0
#
# 用法:   bash download_oa_pdfs.sh
# 输出:   pdfs/           下载到的 PDF
#         下载结果.csv     逐条记录成功/跳过/失败,可直接用 Excel 打开
#
# 说明:
#   · 只抓「① 脚本自动下载」这一类的 50 篇。其余三类见《文献获取清单.xlsx》。
#   · 可反复运行,已下载的自动跳过。
#   · 出版社偶尔改 URL 结构或加反爬,失败条目会写进 CSV 并在结尾列出,
#     照《文献获取清单.xlsx》L 列的链接手动点一下即可。
#   · Windows 用户:用 Git Bash,或在 WSL 里运行。
# =============================================================================

set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="$HERE/pdfs"
CSV="$HERE/下载结果.csv"
mkdir -p "$OUT"

UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"

# ---- 清单: 编号|组|标题|文件名|URL ------------------------------------------
ITEMS=(
"A1-1|A|ICH游戏与青年文化认同 (2026, Front. Psychol.)|A1-1_ICH游戏与青年文化认同_2026.pdf|https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2026.1855866/pdf"
"A1-3|A|VR手工艺非遗多模态学习 (2026, Front. Psychol.)|A1-3_VR手工艺非遗多模态学习_2026.pdf|https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2026.1880795/pdf"
"A1-4|A|SDT严肃游戏准实验 (2025, Front. Psychol.)|A1-4_SDT严肃游戏准实验_2025.pdf|https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2025.1536513/pdf"
"A1-5|A|非遗VR游戏持续使用意向 (2026, Front. Virtual Real.)|A1-5_非遗VR游戏持续使用意向_2026.pdf|https://www.frontiersin.org/journals/virtual-reality/articles/10.3389/frvir.2026.1833878/pdf"
"A1-10|A|VR/AR文化遗产知识迁移 (2025, npj Herit. Sci.)|A1-10_VRAR文化遗产知识迁移_2025.pdf|https://www.nature.com/articles/s40494-025-02247-z.pdf"
"A2-4|A|Wouters 教学支持元分析 (2013)|A2-4_Wouters教学支持元分析_2013.pdf|https://cddoc.uc.cl/wp-content/uploads/2020/03/Metaanalytic_review_rol_instructio.pdf"
"A2-5|A|STEM游戏设计元分析 (2023)|A2-5_STEM游戏设计元分析_2023.pdf|https://link.springer.com/content/pdf/10.1186/s40594-023-00424-9.pdf"
"A2-6|A|STEM数字游戏学习元分析 (2022)|A2-6_STEM数字游戏学习元分析_2022.pdf|https://link.springer.com/content/pdf/10.1186/s40594-022-00344-0.pdf"
"A3-1|A|Jennett 游戏沉浸量表 (2008) ★经典|A3-1_Jennett游戏沉浸量表_2008.pdf|https://www-users.york.ac.uk/paul.cairns/pubs/JennettIJHCS08.pdf"
"A3-2|A|Green & Brock 叙事运输 (2000) ★经典|A3-2_GreenBrock叙事运输_2000.pdf|http://www.communicationcache.com/uploads/1/0/8/8/10887248/the_role_of_transportation_in_the_persuasiveness_of_public_narratives.pdf"
"A3-3|A|van Laer 叙事运输元分析 (2014)|A3-3_vanLaer叙事运输元分析_2014.pdf|https://openaccess.city.ac.uk/id/eprint/18870/1/Extended%20Transportation-Imagery%20Model%20CRO.pdf"
"A3-4|A|Ryan 自我决定理论 PENS (2006) ★经典|A3-4_Ryan自我决定理论PENS_2006.pdf|https://selfdeterminationtheory.org/SDT/documents/2006_RyanRigbyPrzybylski_MandE.pdf"
"A3-5|A|Przybylski 游戏投入动机模型 (2010)|A3-5_Przybylski游戏投入动机模型_2010.pdf|https://selfdeterminationtheory.org/SDT/documents/2010_PrzybylskiRigbyRyan_ROGP.pdf"
"A3-6|A|GameFlow 修订版|A3-6_GameFlow修订版.pdf|https://eprints.qut.edu.au/58216/15/JournCT-GameFlow.pdf"
"A3-7|A|Hamari 游戏化是否有效 (2014)|A3-7_Hamari游戏化是否有效_2014.pdf|http://creativegames.org.uk/modules/Gamification/Hamari_etal_Does_gamification_work-2014.pdf"
"A4-1|A|位置型AR遗产现场评估 (2026, Informatics)|A4-1_位置型AR遗产现场评估_2026.pdf|https://www.mdpi.com/2227-9709/13/1/12/pdf"
"A4-2|A|位置型AR价值共创 (2024, Appl. Sci.)|A4-2_位置型AR价值共创_2024.pdf|https://www.mdpi.com/2076-3417/14/15/6812/pdf"
"A4-4|A|敦煌壁画色彩VR严肃游戏 (2024, npj Herit. Sci.)|A4-4_敦煌壁画色彩VR严肃游戏_2024.pdf|https://www.nature.com/articles/s40494-024-01477-x.pdf"
"A4-7|A|AR文化遗产叙事综述 (2025, Heritage)|A4-7_AR文化遗产叙事综述_2025.pdf|https://www.mdpi.com/2571-9408/8/10/421/pdf"
"A4-8|A|文化遗产位置型游戏综述 (2023, Educ. Sci.)|A4-8_文化遗产位置型游戏综述_2023.pdf|https://www.mdpi.com/2227-7102/13/1/47/pdf"
"A4-9|A|VR文化遗产游戏系统综述 (2022, Appl. Sci.)|A4-9_VR文化遗产游戏系统综述_2022.pdf|https://www.mdpi.com/2076-3417/12/17/8476/pdf"
"A4-10|A|建筑遗产虚拟化系统综述 (2025, npj Herit. Sci.)|A4-10_建筑遗产虚拟化系统综述_2025.pdf|https://www.nature.com/articles/s40494-025-02162-3.pdf"
"B1-1|B|LLM NPC 双刃剑·认知负荷 (2026, arXiv)|B1-1_LLM_NPC双刃剑认知负荷_2026.pdf|https://arxiv.org/pdf/2604.10107"
"B1-3|B|Park 生成式智能体 (2023, UIST) ★准经典|B1-3_Park生成式智能体_2023.pdf|https://arxiv.org/pdf/2304.03442"
"B1-4|B|LLM角色扮演能力评测 (NAACL 2025)|B1-4_LLM角色扮演能力评测_NAACL2025.pdf|https://aclanthology.org/2025.naacl-long.323.pdf"
"B1-5|B|Character-LLM 角色扮演智能体 (2023)|B1-5_CharacterLLM角色扮演智能体_2023.pdf|https://arxiv.org/pdf/2310.10158"
"B1-6|B|LLM角色扮演智能体综述 (2026)|B1-6_LLM角色扮演智能体综述_2026.pdf|https://arxiv.org/pdf/2601.10122"
"B1-7|B|LLM NPC 游戏化学习 (CESCG 2025)|B1-7_LLM_NPC游戏化学习_CESCG2025.pdf|https://cescg.org/wp-content/uploads/2025/04/A-Quest-for-Information-Enhancing-Game-Based-Learning-with-LLM-Driven-NPCs-2.pdf"
"B1-8|B|LLM商人NPC (2024, arXiv)|B1-8_LLM商人NPC_2024.pdf|https://arxiv.org/pdf/2412.11189"
"B2-1|B|古诗词RAG语料与检索 (NAACL 2025) ★|B2-1_古诗词RAG语料与检索_NAACL2025.pdf|https://aclanthology.org/2025.findings-naacl.46.pdf"
"B2-2|B|文化遗产LLM完整性一致性 (EMNLP 2025) ★|B2-2_文化遗产LLM完整性一致性_EMNLP2025.pdf|https://aclanthology.org/2025.emnlp-main.980.pdf"
"B2-6|B|非遗传承人图检索问答 (2026, npj Herit. Sci.)|B2-6_非遗传承人图检索问答_2026.pdf|https://www.nature.com/articles/s40494-026-02384-z.pdf"
"B2-7|B|LLM文化知识评测基准RAG (2025, arXiv)|B2-7_LLM文化知识评测基准RAG_2025.pdf|https://arxiv.org/pdf/2511.01649"
"B3-3|B|Klimmt 真实认同理论 (2009) ★经典|B3-3_Klimmt真实认同理论_2009.pdf|http://net-workingworlds.weebly.com/uploads/1/5/1/5/15155460/videogames__identity.pdf"
"B3-9|B|AI陪伴关系纵向研究 (2025, arXiv)|B3-9_AI陪伴关系纵向研究_2025.pdf|https://arxiv.org/pdf/2510.10079"
"B3-10|B|陪伴聊天机器人适应悖论 (2025, arXiv)|B3-10_陪伴聊天机器人适应悖论_2025.pdf|https://arxiv.org/pdf/2509.12525"
"B4-2|B|超写实虚拟人文化遗产传播 (2025, npj Herit. Sci.)|B4-2_超写实虚拟人文化遗产传播_2025.pdf|https://www.nature.com/articles/s40494-025-02098-8.pdf"
"B4-4|B|非遗遇上AI·拟人化与到访意向 (2026, Sustainability)|B4-4_非遗遇上AI拟人化到访意向_2026.pdf|https://www.mdpi.com/2071-1050/18/8/3977/pdf"
"B4-6|B|AIGC信任与透明标识 (2026, Behav. Sci.) ★|B4-6_AIGC信任与透明标识_2026.pdf|https://www.mdpi.com/2076-328X/16/6/957/pdf"
"B4-8|B|AI标识降低感知准确性 (2025, arXiv)|B4-8_AI标识降低感知准确性_2025.pdf|https://arxiv.org/pdf/2506.16202"
"B4-12|B|LLM文化对齐研究 (2024, arXiv)|B4-12_LLM文化对齐研究_2024.pdf|https://arxiv.org/pdf/2402.13231"
"B4-13|B|区域LLM亦缺文化对齐 (2025, arXiv)|B4-13_区域LLM亦缺文化对齐_2025.pdf|https://arxiv.org/pdf/2505.21548"
"B4-14|B|词联想测验评估文化偏见 (2025, arXiv)|B4-14_词联想测验评估文化偏见_2025.pdf|https://arxiv.org/pdf/2505.18562"
"C-2|C|黑神话YouTube评论·目的地感知 (2026, Sustainability)|C-2_黑神话YouTube评论目的地感知_2026.pdf|https://www.mdpi.com/2071-1050/18/1/160/pdf"
"C-5|C|从像素到地方·遗产地旅行 (2026, HSSC)|C-5_从像素到地方_遗产地旅行_2026.pdf|https://www.nature.com/articles/s41599-026-07299-5.pdf"
"C-7|C|虚拟世界到真实地方·地方依恋 (2026, Tour. Hosp.)|C-7_虚拟世界到真实地方_地方依恋_2026.pdf|https://www.mdpi.com/2673-5768/7/4/99/pdf"
"C-8|C|游戏目的地信任与玩家类型 (2025, Adm. Sci.)|C-8_游戏目的地信任与玩家类型_2025.pdf|https://www.mdpi.com/2076-3387/15/12/470/pdf"
"C-15|C|跨媒介叙事全球扩展 (2025, Front. Commun.) ★|C-15_跨媒介叙事全球扩展_2025.pdf|https://www.frontiersin.org/journals/communication/articles/10.3389/fcomm.2025.1692175/pdf"
"D-3|D|湖北省图书馆·长江国家文化公园专题 (2024)|D-3_湖北省图书馆长江国家文化公园专题_2024.pdf|https://lh.library.hb.cn/ztjj/lhzt/2024/202401/P020240126535677332439.pdf"
"D-7|D|非遗知识图谱中西范式比较 (2025, HSSC)|D-7_非遗知识图谱中西范式比较_2025.pdf|https://www.nature.com/articles/s41599-025-06186-9.pdf"
)

# ---- CSV 表头 (带 BOM, Excel 打开中文不乱码) --------------------------------
printf '\xEF\xBB\xBF' > "$CSV"
echo '编号,分组,文献,状态,文件名,大小KB,来源URL' >> "$CSV"

csv_escape() { printf '"%s"' "$(printf '%s' "$1" | sed 's/"/""/g')"; }

OK=0; SKIP=0; FAIL=0
FAILED=()

echo "开始下载,共 ${#ITEMS[@]} 篇 ..."
echo

for item in "${ITEMS[@]}"; do
  IFS='|' read -r id grp title fname url <<< "$item"
  dest="$OUT/$fname"

  if [[ -s "$dest" ]]; then
    status="跳过(已存在)"
    kb=$(( ( $(wc -c < "$dest") + 1023 ) / 1024 ))
    SKIP=$((SKIP+1))
    printf '  [跳过] %-7s %s\n' "$id" "$title"
  elif curl -fsSL --retry 2 --retry-delay 2 --max-time 120 -A "$UA" \
         -o "$dest.part" "$url" 2>/dev/null \
       && [[ -s "$dest.part" ]] \
       && head -c 4 "$dest.part" | grep -q '%PDF'; then
    mv "$dest.part" "$dest"
    status="成功"
    kb=$(( ( $(wc -c < "$dest") + 1023 ) / 1024 ))
    OK=$((OK+1))
    printf '  [成功] %-7s %s\n' "$id" "$title"
  else
    rm -f "$dest.part"
    status="失败"
    kb=0
    FAIL=$((FAIL+1))
    FAILED+=("$id  $title")
    printf '  [失败] %-7s %s\n' "$id" "$title"
  fi

  {
    csv_escape "$id";    printf ','
    csv_escape "$grp";   printf ','
    csv_escape "$title"; printf ','
    csv_escape "$status";printf ','
    csv_escape "$fname"; printf ','
    printf '%s,' "$kb"
    csv_escape "$url";   printf '\n'
  } >> "$CSV"
done

echo
echo "================================================================"
printf '成功 %d 篇   跳过 %d 篇   失败 %d 篇   (共 %d)\n' "$OK" "$SKIP" "$FAIL" "${#ITEMS[@]}"
echo "PDF 目录:   $OUT"
echo "结果报告:   $CSV   (双击用 Excel 打开)"

if (( FAIL > 0 )); then
  echo
  echo "以下 $FAIL 篇没抓到,请在《文献获取清单.xlsx》里按编号找到,点 L 列链接手动下载:"
  printf '  · %s\n' "${FAILED[@]}"
fi

cat <<'EOF'

----------------------------------------------------------------
本脚本只覆盖「① 脚本自动下载」这 50 篇。另外 56 篇见《文献获取清单.xlsx》:

  ② 免费·浏览器另存      15 篇  —— 开放获取但站点反爬,点链接另存为 PDF
  ③ 需订阅·走图书馆      39 篇  —— 湖工大图书馆 CNKI/WoS/ScienceDirect 镜像
  ④ 专著·借阅或购买       2 篇  —— Falk & Dierking、Jenkins《融合文化》

下载完记得回到《文献获取清单.xlsx》,把 K 列「获取状态」改成「已下载」,
「统计」表会自动更新进度。
----------------------------------------------------------------
EOF
