#!/usr/bin/env bash
# =============================================================================
# 批量下载开放获取(OA)全文 PDF
#
# 用法:  bash download_oa_pdfs.sh
# 输出:  ./pdfs/  目录
#
# 说明:
#   - 只抓开放获取文献。需订阅的文献请用湖工大图书馆的 CNKI / Web of Science /
#     ScienceDirect / SpringerLink 镜像获取,脚本末尾会列出清单。
#   - 脚本是"尽力而为":出版社偶尔改 URL 结构或加反爬,失败的条目会在最后汇总,
#     照着 DOI 手动点一下即可。
#   - 已下载的文件会跳过,可以反复运行。
# =============================================================================

set -uo pipefail
OUT="$(cd "$(dirname "$0")" && pwd)/pdfs"
mkdir -p "$OUT"

OK=0; SKIP=0; FAIL=0
FAILED_LIST=()

get() {
  local name="$1" url="$2"
  local dest="$OUT/$name"
  if [[ -s "$dest" ]]; then
    echo "  [跳过] $name"; SKIP=$((SKIP+1)); return 0
  fi
  if curl -fsSL --retry 2 --retry-delay 2 --max-time 120 \
       -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36" \
       -o "$dest.part" "$url" 2>/dev/null \
     && [[ -s "$dest.part" ]] \
     && head -c 4 "$dest.part" | grep -q '%PDF'; then
    mv "$dest.part" "$dest"; echo "  [完成] $name"; OK=$((OK+1))
  else
    rm -f "$dest.part"; echo "  [失败] $name"; FAIL=$((FAIL+1)); FAILED_LIST+=("$name  <-  $url")
  fi
}

echo "==> A 组:文化游戏化转译与文化学习"
get "A1-1_ICH游戏与青年文化认同_2026.pdf"        "https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2026.1855866/pdf"
get "A1-3_VR手工艺非遗多模态学习_2026.pdf"        "https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2026.1880795/pdf"
get "A1-4_SDT严肃游戏准实验_2025.pdf"            "https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2025.1536513/pdf"
get "A1-5_非遗VR游戏持续使用意向_2026.pdf"        "https://www.frontiersin.org/journals/virtual-reality/articles/10.3389/frvir.2026.1833878/pdf"
get "A1-10_VRAR文化遗产知识迁移_2025.pdf"        "https://www.nature.com/articles/s40494-025-02247-z.pdf"
get "A2-4_Wouters教学支持元分析_2013.pdf"        "https://cddoc.uc.cl/wp-content/uploads/2020/03/Metaanalytic_review_rol_instructio.pdf"
get "A2-5_STEM游戏设计元分析_2023.pdf"           "https://link.springer.com/content/pdf/10.1186/s40594-023-00424-9.pdf"
get "A2-6_STEM数字游戏学习元分析_2022.pdf"        "https://link.springer.com/content/pdf/10.1186/s40594-022-00344-0.pdf"
get "A3-1_Jennett游戏沉浸量表_2008.pdf"          "https://www-users.york.ac.uk/paul.cairns/pubs/JennettIJHCS08.pdf"
get "A3-2_GreenBrock叙事运输_2000.pdf"           "http://www.communicationcache.com/uploads/1/0/8/8/10887248/the_role_of_transportation_in_the_persuasiveness_of_public_narratives.pdf"
get "A3-3_vanLaer叙事运输元分析_2014.pdf"        "https://openaccess.city.ac.uk/id/eprint/18870/1/Extended%20Transportation-Imagery%20Model%20CRO.pdf"
get "A3-4_Ryan自我决定理论PENS_2006.pdf"         "https://selfdeterminationtheory.org/SDT/documents/2006_RyanRigbyPrzybylski_MandE.pdf"
get "A3-5_Przybylski游戏投入动机模型_2010.pdf"    "https://selfdeterminationtheory.org/SDT/documents/2010_PrzybylskiRigbyRyan_ROGP.pdf"
get "A3-6_GameFlow修订版.pdf"                    "https://eprints.qut.edu.au/58216/15/JournCT-GameFlow.pdf"
get "A3-7_Hamari游戏化是否有效_2014.pdf"          "http://creativegames.org.uk/modules/Gamification/Hamari_etal_Does_gamification_work-2014.pdf"
get "A4-1_位置型AR遗产现场评估_2026.pdf"          "https://www.mdpi.com/2227-9709/13/1/12/pdf"
get "A4-2_位置型AR价值共创_2024.pdf"              "https://www.mdpi.com/2076-3417/14/15/6812/pdf"
get "A4-4_敦煌壁画色彩VR严肃游戏_2024.pdf"        "https://www.nature.com/articles/s40494-024-01477-x.pdf"
get "A4-7_AR文化遗产叙事综述_2025.pdf"            "https://www.mdpi.com/2571-9408/8/10/421/pdf"
get "A4-8_文化遗产位置型游戏综述_2023.pdf"        "https://www.mdpi.com/2227-7102/13/1/47/pdf"
get "A4-9_VR文化遗产游戏系统综述_2022.pdf"        "https://www.mdpi.com/2076-3417/12/17/8476/pdf"
get "A4-10_建筑遗产虚拟化系统综述_2025.pdf"       "https://www.nature.com/articles/s40494-025-02162-3.pdf"

echo "==> B 组:AI文化角色与智能化传播"
get "B1-1_LLM_NPC双刃剑认知负荷_2026.pdf"        "https://arxiv.org/pdf/2604.10107"
get "B1-3_Park生成式智能体_2023.pdf"              "https://arxiv.org/pdf/2304.03442"
get "B1-4_LLM角色扮演能力评测_NAACL2025.pdf"      "https://aclanthology.org/2025.naacl-long.323.pdf"
get "B1-5_CharacterLLM角色扮演智能体_2023.pdf"    "https://arxiv.org/pdf/2310.10158"
get "B1-6_LLM角色扮演智能体综述_2026.pdf"         "https://arxiv.org/pdf/2601.10122"
get "B1-7_LLM_NPC游戏化学习_CESCG2025.pdf"        "https://cescg.org/wp-content/uploads/2025/04/A-Quest-for-Information-Enhancing-Game-Based-Learning-with-LLM-Driven-NPCs-2.pdf"
get "B1-8_LLM商人NPC_2024.pdf"                    "https://arxiv.org/pdf/2412.11189"
get "B2-1_古诗词RAG语料与检索_NAACL2025.pdf"      "https://aclanthology.org/2025.findings-naacl.46.pdf"
get "B2-2_文化遗产LLM完整性一致性_EMNLP2025.pdf"  "https://aclanthology.org/2025.emnlp-main.980.pdf"
get "B2-6_非遗传承人图检索问答_2026.pdf"          "https://www.nature.com/articles/s40494-026-02384-z.pdf"
get "B2-7_LLM文化知识评测基准RAG_2025.pdf"        "https://arxiv.org/pdf/2511.01649"
get "B3-3_Klimmt真实认同理论_2009.pdf"            "http://net-workingworlds.weebly.com/uploads/1/5/1/5/15155460/videogames__identity.pdf"
get "B3-9_AI陪伴关系纵向研究_2025.pdf"            "https://arxiv.org/pdf/2510.10079"
get "B3-10_陪伴聊天机器人适应悖论_2025.pdf"       "https://arxiv.org/pdf/2509.12525"
get "B4-2_超写实虚拟人文化遗产传播_2025.pdf"      "https://www.nature.com/articles/s40494-025-02098-8.pdf"
get "B4-4_非遗遇上AI拟人化到访意向_2026.pdf"      "https://www.mdpi.com/2071-1050/18/8/3977/pdf"
get "B4-6_AIGC信任与透明标识_2026.pdf"            "https://www.mdpi.com/2076-328X/16/6/957/pdf"
get "B4-8_AI标识降低感知准确性_2025.pdf"          "https://arxiv.org/pdf/2506.16202"
get "B4-12_LLM文化对齐研究_2024.pdf"              "https://arxiv.org/pdf/2402.13231"
get "B4-13_区域LLM亦缺文化对齐_2025.pdf"          "https://arxiv.org/pdf/2505.21548"
get "B4-14_词联想测验评估文化偏见_2025.pdf"       "https://arxiv.org/pdf/2505.18562"

echo "==> C 组:跨媒介文化IP与虚实外溢"
get "C-2_黑神话YouTube评论目的地感知_2026.pdf"    "https://www.mdpi.com/2071-1050/18/1/160/pdf"
get "C-5_从像素到地方_遗产地旅行_2026.pdf"        "https://www.nature.com/articles/s41599-026-07299-5.pdf"
get "C-7_虚拟世界到真实地方_地方依恋_2026.pdf"    "https://www.mdpi.com/2673-5768/7/4/99/pdf"
get "C-8_游戏目的地信任与玩家类型_2025.pdf"       "https://www.mdpi.com/2076-3387/15/12/470/pdf"
get "C-15_跨媒介叙事全球扩展_2025.pdf"            "https://www.frontiersin.org/journals/communication/articles/10.3389/fcomm.2025.1692175/pdf"

echo "==> D 组:武汉—长江本地与政策"
get "D-3_湖北省图书馆长江国家文化公园专题_2024.pdf" "https://lh.library.hb.cn/ztjj/lhzt/2024/202401/P020240126535677332439.pdf"
get "D-7_非遗知识图谱中西范式比较_2025.pdf"       "https://www.nature.com/articles/s41599-025-06186-9.pdf"

echo
echo "================================================================"
echo "完成: $OK 篇   跳过(已存在): $SKIP 篇   失败: $FAIL 篇"
echo "目录: $OUT"
if (( FAIL > 0 )); then
  echo
  echo "以下条目未能自动获取,请用 文献分类与理由.md 里的 DOI 链接手动下载:"
  printf '  - %s\n' "${FAILED_LIST[@]}"
fi
cat <<'EOF'

----------------------------------------------------------------
以下几篇是开放获取但站点常有反爬,建议在浏览器里直接打开保存:
  · A1-1 PMC 版        https://pmc.ncbi.nlm.nih.gov/articles/PMC13350191/
  · A1-3 PMC 版        https://pmc.ncbi.nlm.nih.gov/articles/PMC13422570/
  · B2-4 MuseRAG++     https://pmc.ncbi.nlm.nih.gov/articles/PMC13470485/
  · B3-13 虚拟偶像粉丝  https://pmc.ncbi.nlm.nih.gov/articles/PMC10702592/
  · B4-5 AI讲解语言策略 https://pmc.ncbi.nlm.nih.gov/articles/PMC12649338/
  · B4-11 LLM文化偏见   https://pmc.ncbi.nlm.nih.gov/articles/PMC11407280/
  · B3-14 NPC情感依恋   https://gamestudies.org/2001/articles/burgessjones
  · B4-10 AI披露与可信度 https://jcom.sissa.it/article/pubid/JCOM_2501_2026_A09/

以下需要机构订阅(走湖工大图书馆镜像):
  A1-2 / A1-6 / A1-7 / A1-8 / A1-9 / A2-1 / A2-2 / A2-7 / A2-3
  A4-3 / A4-5 / A4-6 / A4-11
  B1-2 / B2-3 / B2-5 / B2-8 / B2-9 / B3-1 / B3-2 / B3-6 / B3-8 / B3-12
  B4-1 / B4-3 / B4-7 / B4-9
  C-1 / C-3 / C-4 / C-6 / C-9 / C-10 / C-12 / C-13
经典专著(A3-10 Falk & Dierking、C-14 Jenkins)请走图书馆借阅或购买。
----------------------------------------------------------------
EOF
