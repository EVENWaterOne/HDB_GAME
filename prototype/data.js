(function(root, factory) {
  const data = factory();
  if (typeof module === 'object' && module.exports) module.exports = data;
  else root.HDBData = data;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';
  const buildings = {
    hdb: {name:['HDB 组屋','HDB block'],category:'housing',cost:160,upkeep:4,capacity:240,base:57,unlock:1,color:'#e4cba5',desc:['可升级的公共住房。收入来自市镇服务费，不按居民租金计算。','Upgradeable public housing. Town service fees, rather than residential rent, support the budget.']},
    hawker: {name:['熟食中心','Hawker centre'],category:'services',cost:145,upkeep:7,revenue:4,jobs:25,food:12,radius:2,unlock:1,color:'#d56b45',desc:['平价餐饮与社区生活，摊位收入不足以完全抵消公共运营支出。','Affordable meals and community life. Stall income does not fully cover public operating costs.']},
    foodcourt: {name:['商业食阁','Commercial food court'],category:'commerce',cost:160,upkeep:5,revenue:17,jobs:45,food:7,radius:1,unlock:2,color:'#bc8e68',desc:['商业餐饮收入更高，覆盖与可负担性不如熟食中心。','Higher commercial income, but a smaller reach and less affordable meals.']},
    shops: {name:['邻里商铺','Neighbourhood shops'],category:'commerce',cost:110,upkeep:3,revenue:13,jobs:40,food:3,radius:1,unlock:1,color:'#e0aa6c',desc:['为社区提供日常服务与商业税费。客流取决于周边人口。','Everyday services and business levies. Footfall depends on nearby residents.']},
    office: {name:['企业办公楼','Office building'],category:'commerce',cost:220,upkeep:7,revenue:24,jobs:130,noise:3,radius:1,unlock:2,color:'#8aafc2',desc:['增加就业与税费收入。紧贴住宅会带来噪音和人流。','Jobs and business levies. Noise and footfall affect nearby homes.']},
    tech: {name:['科技办公园','Technology offices'],category:'commerce',cost:310,upkeep:10,revenue:37,jobs:190,noise:2,radius:1,unlock:3,color:'#809bd2',desc:['高投入的服务业升级。交通便利时收益更好。','A higher-cost service economy investment. Good transit improves returns.']},
    market: {name:['平价超市','Affordable supermarket'],category:'commerce',cost:120,upkeep:4,revenue:11,jobs:40,food:8,radius:2,unlock:2,color:'#e0bf61',desc:['商业与民生兼顾，缓解日常生活负担。','Combines everyday affordability with commercial activity.']},
    cc: {name:['社区俱乐部','Community club'],category:'services',cost:125,upkeep:5,social:10,radius:2,unlock:1,color:'#7db8ae',desc:['为邻里提供活动与公共聚集空间。','Activities and gathering space for neighbours.']},
    clinic: {name:['社区诊所','Community clinic'],category:'services',cost:155,upkeep:6,health:11,radius:2,unlock:2,color:'#c9ded7',desc:['医疗覆盖减少居民生活压力，也能降低卫生事件损失。','Healthcare coverage reduces everyday strain and public health losses.']},
    school: {name:['学校与托管','School and childcare'],category:'services',cost:175,upkeep:6,education:9,radius:2,unlock:2,color:'#cbaa8d',desc:['教育与照护服务，提高长期入住吸引力。','Education and care support long-term residential appeal.']},
    eldercare: {name:['乐龄日间中心','Senior day centre'],category:'services',cost:140,upkeep:6,health:6,social:6,radius:1,unlock:3,color:'#c3b49d',desc:['提供近距离照护。步行可达比建设数量更重要。','Local care. Walkable access matters more than the number of centres.']},
    library: {name:['公共图书馆','Public library'],category:'services',cost:170,upkeep:5,education:7,social:5,radius:2,unlock:3,color:'#a295b5',desc:['让学习与社区交往发生在同一处公共空间。','A shared place for learning and community life.']},
    plaza: {name:['社区广场','Community square'],category:'services',cost:70,upkeep:2,social:7,radius:1,unlock:1,color:'#c3b79c',desc:['低成本的公共聚集空间。','A low-cost public gathering space.']},
    bus: {name:['巴士接驳站','Bus interchange'],category:'transport',cost:100,upkeep:4,transit:10,radius:2,unlock:1,color:'#6799a8',desc:['改善通勤，并增加居民可接触的外部工作机会。','Better commuting and access to jobs beyond the neighbourhood.']},
    metro: {name:['地铁接驳','MRT connection'],category:'transport',cost:250,upkeep:8,transit:18,radius:3,unlock:3,color:'#b25155',desc:['广覆盖、高维护的公共交通投资。','A broad-reach transit investment with higher upkeep.']},
    carpark: {name:['多层停车场','Multi-storey car park'],category:'transport',cost:90,upkeep:3,revenue:7,transit:3,radius:1,unlock:1,color:'#9ca5a3',desc:['提供停车与收费收入，占用可作住宅或服务的土地。','Parking and parking fees, using land that could support homes or services.']},
    condo: {name:['私人公寓','Condominium'],category:'housing',cost:0,upkeep:2,capacity:320,base:72,private:true,unlock:2,color:'#d2dae3',desc:['仅通过土地招商卡引入。即时土地收入高，后续市镇收入低。','Introduced only by a land tender card. High one-off land proceeds, low recurring town income.']},
    park: {name:['口袋公园','Pocket park'],category:'eco',cost:80,upkeep:3,green:1,radius:1,unlock:1,color:'#69a960',dlc:true,desc:['绿化 DLC：覆盖邻近组屋，降低热压力。','Green DLC: covers nearby homes and reduces heat stress.']},
    garden: {name:['社区花园','Community garden'],category:'eco',cost:100,upkeep:5,green:1,social:5,radius:2,unlock:2,color:'#87b468',dlc:true,desc:['绿化 DLC：较广的绿地覆盖，维护支出也更高。','Green DLC: broader green coverage and higher upkeep.']},
    drainage: {name:['雨水花园','Rain garden'],category:'eco',cost:115,upkeep:3,green:1,radius:1,unlock:2,color:'#75b5b0',dlc:true,desc:['绿化 DLC：局部降温，减少暴雨造成的积水损失。','Green DLC: local cooling and protection from heavy-rain losses.']},
    solar: {name:['公共太阳能设施','Public solar installation'],category:'eco',cost:150,upkeep:2,revenue:9,energy:18,radius:1,unlock:2,color:'#587fb4',dlc:true,desc:['绿化 DLC：减少公共能源开支与碳排放，投资较慢回收。','Green DLC: lower public energy costs and emissions, with a longer payback.']},
  };
  const cards = {
    grant:{name:['建设拨款','Development grant'],desc:['财政 +90，争取公共建设预算。','Gain 90 in public development funds.'],cost:1,art:'grant',unlock:1},
    buildHousing:{name:['批量建屋计划','Housing programme'],desc:['指定空地及同排相邻空地：最多新建 2 栋组屋，每栋 115。','Pick a lot: build up to 2 HDB blocks in that row, for 115 each.'],cost:2,target:'housingLots',art:'housing',unlock:1},
    renewal:{name:['组屋更新工程','Block renewal'],desc:['指定组屋升一级，升级费用减免 40%。','Upgrade a selected HDB block with a 40% discount.'],cost:2,target:'upgrade',art:'housing',unlock:1},
    landTender:{name:['土地招商','Private land tender'],desc:['指定空地交由开发商建设 Condo，即时财政 +320；后续收入较低。','Tender a lot for a condo: gain 320 now, with low recurring income.'],cost:2,target:'empty',retain:true,art:'condo',unlock:2},
    business:{name:['企业发展扶持','Business support'],desc:['持续：商业收入 +35%，每回合支出 24。获得结束牌。','Ongoing: +35% business income, costing 24 per turn. Adds an End card.'],cost:1,persist:'business',art:'office',unlock:2},
    stopBusiness:{name:['结束企业扶持','End business support'],desc:['停止企业发展扶持及其持续开支。','End business support and its recurring cost.'],cost:0,stops:'business',retain:true,exhaust:true,art:'stop',generated:true},
    transit:{name:['增开公交班次','More bus services'],desc:['持续：全区通勤改善，每回合支出 14。获得结束牌。','Ongoing: better commuting across town, costing 14 per turn. Adds an End card.'],cost:1,persist:'transit',art:'bus',unlock:1},
    stopTransit:{name:['恢复常规班次','Restore regular services'],desc:['停止增开班次及其持续开支。','End extra bus services and their recurring cost.'],cost:0,stops:'transit',retain:true,exhaust:true,art:'stop',generated:true},
    relief:{name:['生活负担补助','Household assistance'],desc:['持续：改善居民可负担性，每回合支出 18。获得结束牌。','Ongoing: ease household costs, for 18 per turn. Adds an End card.'],cost:1,persist:'relief',art:'people',unlock:2},
    stopRelief:{name:['结束生活补助','End household assistance'],desc:['停止生活负担补助及其持续开支。','End household assistance and its recurring cost.'],cost:0,stops:'relief',retain:true,exhaust:true,art:'stop',generated:true},
    community:{name:['邻里活动项目','Neighbourhood programme'],desc:['财政 −35，连续 2 回合宜居度 +7，信任 +4。','Spend 35: +7 liveability for 2 turns, +4 trust.'],cost:1,art:'people',unlock:1},
    visit:{name:['社区调研','Community survey'],desc:['抽 2 张牌，信任 +2；标出服务最薄弱的 3 栋住宅。','Draw 2, gain 2 trust, highlight the 3 least-served homes.'],cost:1,art:'visit',unlock:1},
    commerce:{name:['小商户减负','Small business relief'],desc:['财政 −45，商业税费收入连续 3 回合 +22%。','Spend 45 for +22% business receipts over 3 turns.'],cost:1,art:'office',unlock:2},
    reserve:{name:['储备金调拨','Reserve transfer'],desc:['财政 +150，本局仅可使用一次。','Gain 150 from reserves. One use per copy this game.'],cost:1,exhaust:true,art:'grant',unlock:1},
    austerity:{name:['紧缩支出','Spending squeeze'],desc:['财政 +110，但连续 2 回合宜居度 −6、信任 −5。','Gain 110, but lose 6 liveability for 2 turns and 5 trust.'],cost:1,art:'coin',unlock:1},
    expansion:{name:['新区规划许可','New precinct permit'],desc:['财政 −180，开放南部新区的 18 个地块。','Spend 180 to open 18 lots in the southern precinct.'],cost:2,retain:true,exhaust:true,art:'land',unlock:2},
    mediation:{name:['居民协商会','Resident consultation'],desc:['财政 −25，信任 +10；本回合所有住宅宜居度 +4。','Spend 25: +10 trust and +4 liveability this turn.'],cost:1,art:'people',unlock:1},
    publicWorks:{name:['设施维护计划','Facility maintenance'],desc:['财政 −60，所有老化设施恢复 3 回合维护状态。','Spend 60 to renew ageing facilities for 3 turns.'],cost:1,art:'tools',unlock:3},
    healthResponse:{name:['公共卫生协调','Public health coordination'],desc:['财政 −50，卫生压力连续 2 回合减轻，宜居度 +6。','Spend 50: reduce health pressure and gain 6 liveability for 2 turns.'],cost:1,art:'clinic',unlock:3},
    innovation:{name:['产业更新基金','Industry renewal fund'],desc:['财政 −100，每栋企业办公楼或科技办公园收入永久 +5。','Spend 100: each office or technology building permanently earns 5 more.'],cost:2,exhaust:true,art:'office',unlock:3},
    housingAid:{name:['住房安置支持','Housing assistance'],desc:['本回合入住吸引力 +10，财政 −20。事件限定，保留。','Spend 20: +10 residential appeal this turn. Event-only. Retain.'],cost:0,retain:true,exhaust:true,event:true,art:'housing',generated:true},
    batchEco:{name:['组屋批量绿化','Bulk block greening'],desc:['指定组屋及同排两侧相邻组屋，各以 65 进行生态改造。','Retrofit a block and its immediate row neighbours for 65 each.'],cost:2,target:'retrofit',art:'ecoHousing',unlock:1,dlc:true},
    plant:{name:['社区种树日','Planting day'],desc:['指定空地，免费建成覆盖 1 格的口袋公园。','Build a free pocket park on a lot, with a 1-tile reach.'],cost:1,target:'empty',art:'tree',unlock:1,dlc:true},
    fund:{name:['绿地养护基金','Green upkeep fund'],desc:['持续：绿地覆盖半径 +1，每回合支出 12。获得结束牌。','Ongoing: +1 green coverage radius for 12 per turn. Adds an End card.'],cost:1,persist:'fund',art:'tree',unlock:1,dlc:true},
    stopFund:{name:['结束养护基金','End upkeep fund'],desc:['停止养护基金及其持续开支。','End green upkeep and its recurring cost.'],cost:0,stops:'fund',retain:true,exhaust:true,art:'stop',generated:true,dlc:true},
    saver:{name:['公共设施节能','Public power saving'],desc:['财政 −45，永久减半高温期间公共设施的额外电费。','Spend 45 to permanently halve public heat-related power surcharges.'],cost:2,exhaust:true,art:'solar',unlock:1,dlc:true},
    shade:{name:['熟食中心遮荫','Hawker centre shading'],desc:['指定熟食中心，财政 −45；周边 1 格住宅热压力永久 −1。','Spend 45 to shade a hawker centre: −1 heat stress for homes within 1 tile.'],cost:1,target:'hawker',art:'tree',unlock:1,dlc:true},
    subsidy:{name:['能源电费补贴','Energy bill subsidy'],desc:['持续：热压力 ≥2 的住宅，高温宜居惩罚减半，每回合支出 30。','Ongoing: halve the heat penalty for homes at stress ≥2; cost 30 per turn.'],cost:1,persist:'subsidy',retain:true,exhaust:true,event:true,art:'solar',generated:true,dlc:true},
    stopSubsidy:{name:['结束能源补贴','End energy subsidy'],desc:['主动停止能源补贴。高温结束不会自动停止支出。','End the subsidy yourself. Its costs continue after the heat event.'],cost:0,stops:'subsidy',retain:true,exhaust:true,art:'stop',generated:true,dlc:true},
    cool:{name:['开放避暑点','Open cooling centres'],desc:['本回合熟食中心和社区俱乐部周边住宅热压力 −1。','For this turn, homes near hawker centres and community clubs get −1 heat stress.'],cost:0,retain:true,exhaust:true,event:true,art:'people',generated:true,dlc:true},
    heatVisit:{name:['热浪入户走访','Heatwave home visits'],desc:['抽 2 张牌，标出热压力最高的 3 栋住宅。','Draw 2 and highlight the 3 homes facing the most heat stress.'],cost:0,retain:true,exhaust:true,event:true,art:'visit',generated:true,dlc:true},
  };
  const policies = {
    business:{card:'business',cost:24,stop:'stopBusiness'},
    transit:{card:'transit',cost:14,stop:'stopTransit'},
    relief:{card:'relief',cost:18,stop:'stopRelief'},
    fund:{card:'fund',cost:12,stop:'stopFund',dlc:true},
    subsidy:{card:'subsidy',cost:30,stop:'stopSubsidy',dlc:true},
  };
  const campaignDeck=['grant','grant','grant','buildHousing','buildHousing','renewal','visit','transit','community','reserve','mediation','austerity'];
  const freeDeck=['grant','grant','buildHousing','renewal','landTender','business','transit','relief','visit','reserve','community','mediation','commerce','expansion'];
  const ecoDeck=['grant','grant','batchEco','batchEco','plant','plant','fund','saver','shade','reserve','visit','mediation'];
  const chapterCards={2:['landTender','business','relief','commerce','expansion'],3:['publicWorks','healthResponse','innovation'],4:['grant','mediation','renewal']};
  const years=[1960,1964,1968,1972,1976,1980,1984,1989,1993,1997,2001,2003,2007,2011,2015,2018,2020,2022,2024,2026];
  const chapters=[['安居起步','Building a home'],['社区成形','A town takes shape'],['成熟与转型','Maturity and renewal'],['韧性与未来','Resilience and the future']];
  const events = {
    ownership:{name:['居者有其屋 · 1964','Home ownership · 1964'],desc:['购房支持改变入住需求。历史节点固定发生，你决定本社区的配套。','Home ownership changes housing demand. The historical milestone is fixed; local support is your choice.'],historic:true,source:'https://www.hdb.gov.sg/about-us/our-story/our-history',choices:[{name:['完善住房配套 · −60','Housing support · −60'],cost:60,trust:5,mod:{kind:'appeal',value:10,duration:3},cards:['housingAid']},{name:['优先扩充财政 · +50','Budget first · +50'],gain:50,trust:-3}]},
    cpf:{name:['住房融资改变 · 1968','Housing finance changes · 1968'],desc:['CPF 可用于购房的历史背景带来更多住房需求。此处效果为游戏化演绎。','The historical use of CPF for housing brings new demand. Effects here are a game interpretation.'],historic:true,source:'https://www.hdb.gov.sg/about-us/our-story/our-history',choices:[{name:['承接新住户 · −45','Support newcomers · −45'],cost:45,mod:{kind:'appeal',value:14,duration:3}},{name:['分期推进 · +40','Phase the programme · +40'],gain:40,mod:{kind:'appeal',value:5,duration:2}}]},
    integration:{name:['族群融合政策 · 1989','Ethnic Integration Policy · 1989'],desc:['历史政策节点改变社区治理环境。协商需要预算，纯行政处理更快。','A historical policy milestone changes governance. Consultation costs money; administrative handling is quicker.'],historic:true,source:'https://www.hdb.gov.sg/about-us/our-story/our-history',choices:[{name:['投入邻里协商 · −70','Neighbourhood consultation · −70'],cost:70,trust:12,mod:{kind:'live',value:5,duration:3}},{name:['行政执行','Administrative implementation'],trust:-6,mod:{kind:'appeal',value:-4,duration:2}}]},
    downturn:{name:['经济需求放缓','Economic demand slows'],desc:['企业与商业收入承压。短期扶持会增加公共财政负担。','Commercial receipts are under pressure. Short-term support places a burden on public finances.'],mod:{kind:'economy',value:-0.32,duration:2},choices:[{name:['定向扶持 · −65','Targeted support · −65'],cost:65,mod:{kind:'economy',value:0.22,duration:2},trust:4},{name:['保留储备','Preserve reserves'],trust:-3,mod:{kind:'live',value:-3,duration:2}}]},
    health:{name:['公共卫生压力','Public health pressure'],desc:['生活与经营活动受限。诊所覆盖能减轻冲击，但未覆盖的街区仍需要支持。','Daily life and commerce face restrictions. Clinics soften the shock, but uncovered blocks still need support.'],mod:{kind:'healthShock',value:9,duration:2},choices:[{name:['公共卫生协调 · −65','Coordinate health response · −65'],cost:65,mod:{kind:'healthShock',value:-6,duration:2},trust:6},{name:['基本服务优先','Prioritise basic services'],trust:-2}]},
    shortage:{name:['住房轮候加长','Housing waiting list grows'],desc:['现有住宅接近满员。扩建、升级与配套服务需要一起考虑。','Homes are close to full. New housing, upgrades and services need to be considered together.'],choices:[{name:['争取建设援助','Seek housing assistance'],gain:60,cards:['housingAid'],trust:2},{name:['缓慢消化需求','Absorb demand gradually'],trust:-4,mod:{kind:'appeal',value:-4,duration:2}}]},
    complaints:{name:['餐饮与服务投诉','Local service complaints'],desc:['部分住宅缺少步行可达的餐饮。地图上的覆盖比全区设施总量更有意义。','Some homes lack walkable food access. Spatial coverage matters more than the town-wide facility count.'],choices:[{name:['临时服务支援 · −30','Temporary service support · −30'],cost:30,mod:{kind:'live',value:5,duration:2},trust:3},{name:['记录并等待','Record and wait'],trust:-4}]},
    budget:{name:['财政审查','Budget review'],desc:['收入与维护支出的差距正在扩大。一次性收入能争取时间，不能替代持续现金流。','Upkeep is outpacing receipts. One-off proceeds buy time, but cannot replace recurring cash flow.'],choices:[{name:['申请过渡拨款','Request bridging funds'],gain:90,trust:-2},{name:['坚持原计划','Keep the current plan'],trust:2}]},
    ageing:{name:['设施进入更新期','Facilities need renewal'],desc:['早期建成的设施开始老化。维护计划能恢复服务，拆除会损失原有覆盖。','Older facilities are ageing. Maintenance restores services; demolition removes coverage.'],choices:[{name:['启动维护 · −60','Renew facilities · −60'],cost:60,repair:true,trust:3},{name:['暂缓维护','Defer maintenance'],trust:-3}]},
    heat:{name:['极端高温','Extreme heat'],desc:['绿化 DLC：逐栋计算热压力。居民制冷开支影响宜居度，公共设施额外用电影响财政。','Green DLC: heat stress is calculated per home. Household cooling bills affect liveability; public power use affects the budget.'],dlc:true,choices:[{name:['发布高温应急预案','Issue the heat response plan'],trust:2},{name:['加强社区宣传 · −20','Expand community outreach · −20'],cost:20,trust:5,mod:{kind:'live',value:3,duration:1}}]},
    rain:{name:['暴雨积水','Heavy rain and flooding'],desc:['绿化 DLC：雨水花园减少公共维修损失；绿化设施仍需要维护。','Green DLC: rain gardens reduce repair losses. Green infrastructure still needs upkeep.'],dlc:true,choices:[{name:['公共设施抢修 · −45','Repair public facilities · −45'],cost:45,trust:3},{name:['先做基本清理','Basic cleanup first'],cost:0,trust:-3,mod:{kind:'live',value:-5,duration:2}}]},
  };
  return {version:1,buildings,cards,policies,campaignDeck,freeDeck,ecoDeck,chapterCards,years,chapters,events,
    source:{repo:'https://github.com/EVENWaterOne/HDB_GAME',commit:'99ce0fd300531cde84490b726f038495b2ec4c67'},
    settings:{upgradeCosts:[0,110,155],hdbCapacity:[0,240,320,420],draw:5,political:3,retrofitCost:120},
  };
});
