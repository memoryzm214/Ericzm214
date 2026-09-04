# -*- coding: utf-8 -*-
# 批次6：换题及连带修改。全部为定向文串替换，不触及任何数据与实验描述。
NEW_TITLE = '《高校共享道路慢行主体的安全认知偏差与行为引导研究》'

# (旧串, 新串) —— 均为文档中的精确子串
EDITS = [
# ===== 封面 =====
('《高校共享道路的交通冲突机理与安全引导策略研究》', NEW_TITLE),
('2025年度武汉市社科联课题', ''),

# ===== 中文摘要 =====
('高校共享道路是行人与骑行者在同一空间内混合通行的典型场所。',
 '高校共享道路是行人与骑行者在同一空间内混合通行的典型场所，本研究将上述两类交通参与者统称为慢行主体。'),
('也来自双方在安全认知上的系统性差异。本课题以湖北工业大学主校区为实证对象，遵循“特征识别—模型构建—需求识别—策略生成”的研究路径，对高校共享道路的交通冲突机理与安全引导策略展开系统研究，并据此开发相应的视觉引导系统设计原型。',
 '也来自慢行主体在安全认知上的系统性差异：同一路段的风险，在行人与骑行者眼中往往并不相同，而两者的判断又都可能偏离客观实际。本课题以湖北工业大学主校区为实证对象，遵循“特征识别—模型构建—需求识别—策略生成”的研究路径，在识别交通冲突时空分布与行为特征的基础上，系统测度慢行主体主观安全认知与客观安全属性之间的偏差，揭示其向交通行为转化的作用机理，并据此开发面向慢行主体的安全引导系统设计原型。'),
('揭示了安全认知偏差作为交通冲突内生驱动机制的作用路径，并将理论发现转化为可实施的视觉引导设计方案，为高校共享道路的安全治理提供了理论与实践两个层面的支撑。',
 '把安全认知偏差由方法学上的信度问题确立为可测度的研究对象，揭示其作为交通冲突内生驱动机制的作用路径，并将理论发现转化为可实施的安全引导设计方案，为高校共享道路慢行主体的行为引导与校园交通安全治理提供了理论与实践两个层面的支撑。'),
('关键词：高校共享道路；交通冲突；安全认知偏差；行为决策模型；视觉引导系统；设计干预',
 '关键词：高校共享道路；慢行主体；安全认知偏差；交通冲突；行为决策模型；安全引导'),

# ===== 英文摘要 =====
('within the same physical corridor. Conflicts in such spaces arise not only from competition for right of way, but also from systematic differences in how the two groups perceive safety. Taking the main campus of Hubei University of Technology as the empirical setting, this study follows a research path of "feature identification - model construction - need identification - strategy generation" to examine the mechanisms underlying traffic conflicts on campus shared roads, and to develop a corresponding visual guidance system prototype.',
 'within the same physical corridor; this study refers to these two groups collectively as non-motorised users. Conflicts in such spaces arise not only from competition for right of way, but also from systematic differences in how the two groups perceive safety, and from the fact that both may misjudge the actual level of risk. Taking the main campus of Hubei University of Technology as the empirical setting, this study follows a research path of "feature identification - model construction - need identification - strategy generation". Building on the identification of the spatial, temporal and behavioural characteristics of conflicts, it measures the discrepancy between the subjective safety perception of non-motorised users and the objective safety attributes of the road, examines how this discrepancy is translated into travel behaviour, and develops a safety guidance system prototype for non-motorised users.'),
('in identifying safety-related cognitive bias as an endogenous driver of traffic conflict, and in translating these findings into an implementable visual guidance design, thereby providing both theoretical and practical support for the safety governance of campus shared roads.',
 'in establishing safety-related cognitive bias as a measurable object of study rather than a question of measurement reliability, in identifying it as an endogenous driver of traffic conflict, and in translating these findings into an implementable safety guidance design, thereby providing theoretical and practical support for the behavioural guidance of non-motorised users and for the safety governance of campus shared roads.'),
('Keywords: campus shared road; traffic conflict; safety cognitive bias; behavioural decision model; visual guidance system; design intervention',
 'Keywords: campus shared road; non-motorised users; safety cognitive bias; traffic conflict; behavioural decision model; safety guidance'),

# ===== 1.1 学理层面收束 =====
('因此，本课题将安全认知偏差作为贯穿全篇的核心线索，既是对既有理论争议的回应',
 '因此，本课题将安全认知偏差作为贯穿全篇的核心线索，并以行人与骑行者所构成的慢行主体作为统一的分析单元，这既是对既有理论争议的回应'),

# ===== 2.2 核心研究问题 =====
('本课题的核心研究问题在于：针对高校共享道路的交通冲突机理开展的系统性研究，以及提升共享道路安全性的实践策略研究均相对不足。',
 '本课题的核心研究问题在于：既有研究对高校共享道路交通冲突的客观识别与对参与者心理机制的解释尚未打通，慢行主体主观安全认知与客观风险之间的系统性偏差未被作为独立对象加以测度，由认知机理通向设计实践的转化路径亦不明确。'),

# ===== 2.2 研究目标（该串在 2.2 与 5.1 各出现一次，一并替换）=====
('本课题聚焦于高校共享道路中的交通安全议题，以行人和骑行者作为研究对象，遵循“特征识别—模型构建—需求识别—策略生成”的研究路径，系统性地探究高校共享道路内部的交通冲突机理，并据此构建共享道路交通参与者的行为模型，进而形成降低共享道路交通冲突的安全引导策略，为营造安全的校园共享交通环境提供理论与实践层面的支撑。',
 '本课题聚焦于高校共享道路中的交通安全议题，以行人和骑行者所构成的慢行主体作为研究对象，遵循“特征识别—模型构建—需求识别—策略生成”的研究路径，在识别交通冲突时空分布与行为特征的基础上，系统测度慢行主体主观安全认知与客观安全属性之间的偏差，揭示认知偏差向行为意图转化的作用机理，并据此分别构建行人与骑行者的行为决策模型，进而形成面向慢行主体的安全引导策略，为营造安全的校园共享交通环境提供理论与实践层面的支撑。'),

# ===== 5.1 首段引言 =====
('鉴于当前有关高校共享道路交通冲突的系统化理论研究以及安全引导策略均相对缺乏，',
 '鉴于当前有关高校共享道路慢行主体安全认知偏差的系统化研究，以及由认知机理通向行为引导的实践路径均相对缺乏，'),

# ===== 3.4 子任务④（补入触感要素）=====
('并基于设计学视角构建一套视觉车道引导系统的设计原型，通过道路标识、标线、色彩引导、动态提示装置等视觉元素，改善共享道路主要参与者对空间的感知和行为决策。',
 '并基于设计学视角构建一套安全引导系统的设计原型，通过道路标识、标线、色彩编码、触感提示与动态提示装置等要素，改善慢行主体对空间的感知和行为决策。'),

# ===== 4.3 节导语 =====
('道路使用者的主观安全认知与道路客观安全属性之间往往存在显著偏差。此类认知偏差不仅影响着共享道路交通参与者的行为决策，更是导致交通冲突和事故的重要诱因。本研究旨在深入探究',
 '慢行主体的主观安全认知与道路客观安全属性之间往往存在显著偏差。此类认知偏差不仅影响着慢行主体的行为决策，更是导致交通冲突和事故的重要诱因。本子任务在整个研究链条中处于枢纽位置：它一方面承接前两项子任务所获得的冲突分布规律与行为机理，另一方面又为后续的策略生成提供直接依据，因而是由“为何发生”通向“如何改善”的关键环节。本研究旨在深入探究'),
('并基于这种差异形成构建面向高校共享道路的安全引导需求清单',
 '并基于这种差异构建面向慢行主体的安全引导需求清单'),
('第三，通过哪些需求能够引导设计干预缩小认知偏差，提升道路使用的安全性与舒适性。',
 '第三，通过哪些设计需求能够缩小认知偏差，进而引导慢行主体形成更为安全的通行行为。'),

# ===== “视觉引导”术语统一（讨论视觉通道本身的一处予以保留）=====
('本课题所聚焦的视觉引导设计，处于工程路径与信息传递之间',
 '本课题所聚焦的安全引导设计，处于工程路径与信息传递之间'),
('视觉引导之所以能够发挥作用，其理论基础来自环境认知与信息加工两个方面',
 '安全引导之所以能够发挥作用，其理论基础来自环境认知与信息加工两个方面'),
('将视觉引导系统嵌入典型校园场景', '将安全引导系统嵌入典型校园场景'),
('为后续视觉引导系统原型设计提供科学依据', '为后续安全引导系统原型设计提供科学依据'),
('系统梳理视觉引导系统的设计维度', '系统梳理安全引导系统的设计维度'),
('校园共享道路标识系统作为地面的视觉引导网络', '校园共享道路标识系统作为地面的引导网络'),
('优化后的视觉引导策略能够降低行人与骑行者在关键节点的冲突风险',
 '优化后的安全引导策略能够降低行人与骑行者在关键节点的冲突风险'),
('其中部分实施视觉引导改造、部分保持原状作为对照',
 '其中部分实施安全引导系统改造、部分保持原状作为对照'),
]

# 5.1 首段“聚焦”重复的修饰
EDITS.append((
 '实践路径均相对缺乏，本课题聚焦于高校共享道路中的交通安全议题，以行人和骑行者所构成的慢行主体作为研究对象',
 '实践路径均相对缺乏，本课题以行人和骑行者所构成的慢行主体作为研究对象'))

# 插在 2.2 研究目标段之后
DEFINITION = ['需要说明的是，本研究所称慢行主体，特指校园共享道路上的行人与骑行者两类交通参与者，其中骑行者涵盖使用自行车与电动自行车者；相应地，本研究所称共享道路，指未在不同交通方式之间作物理分隔、由上述两类主体共同使用的校园道路。之所以以慢行主体而非单一交通方式作为研究对象，是因为本研究所关注的安全认知偏差与交通冲突，均产生于两类主体的相互作用之中：行人的风险感知取决于骑行者的速度与轨迹，骑行者的通行判断亦受制于行人的分布与避让预期，脱离任何一方都无法对冲突的形成作出完整解释。']
