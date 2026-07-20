import React, { useEffect, useMemo, useRef, useState } from 'react';

const MONTHS = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December'
];

const WING_KEYS = [
	{ key: 'jih', label: 'JIH' },
	{ key: 'vanitha', label: 'വനിത' },
	{ key: 'solidarity', label: 'സോളിഡാരിറ്റി' },
	{ key: 'sio', label: 'SIO' },
	{ key: 'gio', label: 'GIO' }
];

const GROWTH_WING_KEYS = [
	{ key: 'jih', label: 'JIH' },
	{ key: 'vanitha', label: 'വനിത' },
	{ key: 'solidarity', label: 'സോളിഡാരിറ്റി' },
	{ key: 'sio', label: 'SIO' },
	{ key: 'gio', label: 'GIO' },
	{ key: 'teenIndia', label: 'ടീന്‍ ഇന്ത്യ' },
	{ key: 'malarvadi', label: 'മലര്‍വാടി' }
];

function extractValues(survey) {
	return {
		partA: {
			kh: survey?.partA?.kh ?? 0,
			vkh: survey?.partA?.vkh ?? 0
		},
		partB: WING_KEYS.reduce((acc, w) => {
			const a = survey?.partB?.wingAttendance?.[w.key] || {};
			acc[w.key] = {
				present: a.present ?? 0,
				leave: a.leave ?? 0,
				absent: a.absent ?? 0
			};
			return acc;
		}, {}),
		partC: {
			jih: survey?.partD?.activities?.jih?.componentVisits ?? 0,
			vanitha: survey?.partD?.activities?.vanitha?.componentVisits ?? 0,
			solidarity: survey?.partD?.activities?.solidarity?.componentVisits ?? 0,
			sio: survey?.partD?.activities?.sio?.componentVisits ?? 0
		},
		partE: {
			male: survey?.partE?.male ?? 0,
			female: survey?.partE?.female ?? 0
		},
		partF: GROWTH_WING_KEYS.reduce((acc, w) => {
			const g = survey?.partF?.wingGrowth?.[w.key] || {};
			acc[w.key] = {
				newComponents: g.newComponents ?? 0,
				newMembers: g.newMembers ?? 0
			};
			return acc;
		}, {})
	};
}

export default function AreaMonthlyStatsTable({ surveys, onRowClick }) {
	const [activePart, setActivePart] = useState('partA');
	const rows = useMemo(() => {
		const monthsWithData = new Set((surveys || []).map((s) => s.month));
		return MONTHS.filter((m) => monthsWithData.has(m));
	}, [surveys]);

	// Helper function to create a statistics table with horizontal layout
	const createStatsTable = (title, columns, getData) => {
		return (
			<div className="bg-white rounded-2xl shadow-lg border border-gray-200 w-full mb-6 hover:shadow-xl transition-all duration-300">
				<div className="px-6 py-4 border-b border-gray-200">
					<h3 className="text-lg font-bold text-[#002349]">{title}</h3>
				</div>
				<div className="overflow-x-auto">
					<table className="w-full">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Month</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Year</th>
								{columns.map((col, idx) => (
									<th key={idx} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
										{col}
									</th>
								))}
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-200">
							{rows.map((monthName, rIdx) => {
								const candidates = (surveys || []).filter((s) => s.month === monthName);
								const survey = candidates.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))[0];
								const data = getData(survey);
								
								const handleRowClick = (e) => {
									if (!onRowClick || !survey) return;
									e.preventDefault();
									e.stopPropagation();
									onRowClick(survey);
								};

								return (
									<tr 
										key={`${monthName}-${rIdx}`}
										className="hover:bg-gradient-to-r hover:from-[#002349]/5 hover:to-[#957C3D]/5 cursor-pointer transition-all duration-300 group"
										onClick={handleRowClick}
										tabIndex={0}
										onKeyDown={(e) => {
											if (e.key === 'Enter') handleRowClick(e);
										}}
									>
										<td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-[#002349]">
											{monthName}
										</td>
										<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
											{survey?.year ?? (survey?.submittedAt ? new Date(survey.submittedAt).getFullYear() : '')}
										</td>
										{data.map((value, idx) => (
											<td key={idx} className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 font-medium group-hover:text-gray-900 transition-colors duration-300">
												{value}
											</td>
										))}
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			</div>
		);
	};

	const partButtons = [
		{ key: 'partA', label: 'Part A – ആകെ ഘടകങ്ങൾ' },
		{ key: 'partB', label: 'Part B – പ്രതിമാസയോഗ ഹാജർ' },
		{ key: 'partC', label: 'Part C – ഘടക സന്ദര്‍ശനങ്ങള്‍' },
		{ key: 'partE', label: 'Part E – സംസാരിച്ച വ്യക്തികൾ' },
		{ key: 'partF', label: 'Part F – റിപ്പോർട്ട് കാലയളവിലെ വർദ്ധനവ്' }
	];

	// Helper function to create a single table with vertical organization for complex parts (Part B and Part F)
	const createVerticalStatsTable = (title, getSectionsData) => {
		return (
			<div className="bg-white rounded-2xl shadow-lg border border-gray-200 w-full mb-6 hover:shadow-xl transition-all duration-300">
				<div className="px-6 py-4 border-b border-gray-200">
					<h3 className="text-lg font-bold text-[#002349]">{title}</h3>
				</div>
				<div className="overflow-x-auto">
					<table className="w-full">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Month</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Year</th>
								{getSectionsData({}).map((section, idx) => (
									<th key={idx} colSpan={section.items.length} className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider border-l border-gray-200">
										{section.title}
									</th>
								))}
							</tr>
							<tr>
								<th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"></th>
								<th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"></th>
								{getSectionsData({}).map((section, sectionIdx) => 
									section.items.map((item, itemIdx) => (
										<th key={`${sectionIdx}-${itemIdx}`} className="px-2 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider border-l border-gray-200">
											{item.label}
										</th>
									))
								)}
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-200">
							{rows.map((monthName, rIdx) => {
								const candidates = (surveys || []).filter((s) => s.month === monthName);
								const survey = candidates.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))[0];
								const sections = getSectionsData(survey);
								
								const handleRowClick = (e) => {
									if (!onRowClick || !survey) return;
									e.preventDefault();
									e.stopPropagation();
									onRowClick(survey);
								};

								return (
									<tr 
										key={`${monthName}-${rIdx}`}
										className="hover:bg-gradient-to-r hover:from-[#002349]/5 hover:to-[#957C3D]/5 cursor-pointer transition-all duration-300 group"
										onClick={handleRowClick}
										tabIndex={0}
										onKeyDown={(e) => {
											if (e.key === 'Enter') handleRowClick(e);
										}}
									>
										<td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-[#002349]">
											{monthName}
										</td>
										<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
											{survey?.year ?? (survey?.submittedAt ? new Date(survey.submittedAt).getFullYear() : '')}
										</td>
										{sections.map((section, sectionIdx) => 
											section.items.map((item, itemIdx) => (
												<td key={`${sectionIdx}-${itemIdx}`} className="px-2 py-4 whitespace-nowrap text-sm text-gray-700 font-medium text-center border-l border-gray-200 group-hover:text-gray-900 transition-colors duration-300">
													{item.value}
												</td>
											))
										)}
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			</div>
		);
	};

	const renderActiveTable = () => {
		switch (activePart) {
			case 'partA':
				return createStatsTable(
					"Part A – ആകെ ഘടകങ്ങൾ",
					["KH", "VKH"],
					(survey) => {
						const v = extractValues(survey);
						return [v.partA.kh, v.partA.vkh];
					}
				);
			case 'partB':
				return createVerticalStatsTable(
					"Part B – പ്രതിമാസയോഗ ഹാജർ",
					(survey) => {
						const v = extractValues(survey);
						return [
							{
								title: "JIH",
								items: [
									{ label: "ഹാജർ", value: v.partB.jih?.present ?? 0 },
									{ label: "ലീവ്", value: v.partB.jih?.leave ?? 0 },
									{ label: "ആബ്‌സന്റ്", value: v.partB.jih?.absent ?? 0 }
								]
							},
							{
								title: "വനിത",
								items: [
									{ label: "ഹാജർ", value: v.partB.vanitha?.present ?? 0 },
									{ label: "ലീവ്", value: v.partB.vanitha?.leave ?? 0 },
									{ label: "ആബ്‌സന്റ്", value: v.partB.vanitha?.absent ?? 0 }
								]
							},
							{
								title: "സോളിഡാരിറ്റി",
								items: [
									{ label: "ഹാജർ", value: v.partB.solidarity?.present ?? 0 },
									{ label: "ലീവ്", value: v.partB.solidarity?.leave ?? 0 },
									{ label: "ആബ്‌സന്റ്", value: v.partB.solidarity?.absent ?? 0 }
								]
							},
							{
								title: "SIO",
								items: [
									{ label: "ഹാജർ", value: v.partB.sio?.present ?? 0 },
									{ label: "ലീവ്", value: v.partB.sio?.leave ?? 0 },
									{ label: "ആബ്‌സന്റ്", value: v.partB.sio?.absent ?? 0 }
								]
							},
							{
								title: "GIO",
								items: [
									{ label: "ഹാജർ", value: v.partB.gio?.present ?? 0 },
									{ label: "ലീവ്", value: v.partB.gio?.leave ?? 0 },
									{ label: "ആബ്‌സന്റ്", value: v.partB.gio?.absent ?? 0 }
								]
							}
						];
					}
				);
			case 'partC':
				return createStatsTable(
					"Part C – ഘടക സന്ദര്‍ശനങ്ങള്‍ (എണ്ണം)",
					["JIH", "വനിത", "സോളിഡാരിറ്റി", "SIO"],
					(survey) => {
						const v = extractValues(survey);
						return [v.partC.jih, v.partC.vanitha, v.partC.solidarity, v.partC.sio];
					}
				);
			case 'partE':
				return createStatsTable(
					"Part E – സംസാരിച്ച വ്യക്തികൾ",
					["ആണ്‍", "പെണ്‍"],
					(survey) => {
						const v = extractValues(survey);
						return [v.partE.male, v.partE.female];
					}
				);
			case 'partF':
				return createVerticalStatsTable(
					"Part F – റിപ്പോർട്ട് കാലയളവിലെ വർദ്ധനവ്",
					(survey) => {
						const v = extractValues(survey);
						return [
							{
								title: "JIH",
								items: [
									{ label: "പുതിയ ഘടകങ്ങള്‍ എണ്ണം", value: v.partF.jih?.newComponents ?? 0 },
									{ label: "പുതുതായി വന്നവര്‍", value: v.partF.jih?.newMembers ?? 0 }
								]
							},
							{
								title: "വനിത",
								items: [
									{ label: "പുതിയ ഘടകങ്ങള്‍ എണ്ണം", value: v.partF.vanitha?.newComponents ?? 0 },
									{ label: "പുതുതായി വന്നവര്‍", value: v.partF.vanitha?.newMembers ?? 0 }
								]
							},
							{
								title: "സോളിഡാരിറ്റി",
								items: [
									{ label: "പുതിയ ഘടകങ്ങള്‍ എണ്ണം", value: v.partF.solidarity?.newComponents ?? 0 },
									{ label: "പുതുതായി വന്നവര്‍", value: v.partF.solidarity?.newMembers ?? 0 }
								]
							},
							{
								title: "SIO",
								items: [
									{ label: "പുതിയ ഘടകങ്ങള്‍ എണ്ണം", value: v.partF.sio?.newComponents ?? 0 },
									{ label: "പുതുതായി വന്നവര്‍", value: v.partF.sio?.newMembers ?? 0 }
								]
							},
							{
								title: "GIO",
								items: [
									{ label: "പുതിയ ഘടകങ്ങള്‍ എണ്ണം", value: v.partF.gio?.newComponents ?? 0 },
									{ label: "പുതുതായി വന്നവര്‍", value: v.partF.gio?.newMembers ?? 0 }
								]
							},
							{
								title: "ടീന്‍ ഇന്ത്യ",
								items: [
									{ label: "പുതിയ ഘടകങ്ങള്‍ എണ്ണം", value: v.partF.teenIndia?.newComponents ?? 0 },
									{ label: "പുതുതായി വന്നവര്‍", value: v.partF.teenIndia?.newMembers ?? 0 }
								]
							},
							{
								title: "മലര്‍വാടി",
								items: [
									{ label: "പുതിയ ഘടകങ്ങള്‍ എണ്ണം", value: v.partF.malarvadi?.newComponents ?? 0 },
									{ label: "പുതുതായി വന്നവര്‍", value: v.partF.malarvadi?.newMembers ?? 0 }
								]
							}
						];
					}
				);
			default:
				return null;
		}
	};

	return (
		<div className="space-y-6">
			{/* Part Selection Buttons */}
			<div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-3">
				<div className="flex flex-wrap gap-3">
					{partButtons.map((part) => (
						<button
							key={part.key}
							onClick={() => setActivePart(part.key)}
							className={`px-4 py-2 rounded-2xl text-sm font-semibold transition-all duration-300 transform hover:scale-105 ${
								activePart === part.key
									? 'bg-gradient-to-r from-[#002349] to-[#1a3a5c] text-white shadow-md'
									: 'bg-gray-100 text-gray-700 hover:bg-gradient-to-r hover:from-gray-200 hover:to-gray-100 hover:shadow-sm'
							}`}
						>
							{part.label}
						</button>
					))}
				</div>
			</div>

			{/* Active Table */}
			{renderActiveTable()}
		</div>
	);
}


