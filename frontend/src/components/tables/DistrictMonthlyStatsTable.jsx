import React, { useEffect, useMemo, useRef, useState } from 'react';

const MONTHS = [
	'January', 'February', 'March', 'April', 'May', 'June',
	'July', 'August', 'September', 'October', 'November', 'December'
];

const WINGS = [
	{ key: 'jih', label: 'JIH' },
	{ key: 'vanitha', label: 'വനിത' },
	{ key: 'solidarity', label: 'സോളിഡാരിറ്റി' },
	{ key: 'sio', label: 'SIO' },
	{ key: 'gio', label: 'GIO' }
];

const GROWTH_WINGS = [
	{ key: 'jih', label: 'JIH' },
	{ key: 'vanitha', label: 'വനിത' },
	{ key: 'solidarity', label: 'സോളിഡാരിറ്റി' },
	{ key: 'sio', label: 'SIO' },
	{ key: 'gio', label: 'GIO' },
	{ key: 'teenIndia', label: 'ടീൻ ഇന്ത്യ' },
	{ key: 'malarvadi', label: 'മലർവാടി' }
];

function extractValues(survey) {
	return {
		partA: WINGS.reduce((acc, w) => {
			const a = survey?.partA?.attendance?.[w.key] || {};
			acc[w.key] = {
				present: a.present ?? 0,
				leave: a.leave ?? 0,
				absent: a.absent ?? 0
			};
			return acc;
		}, {}),
		partB: WINGS.reduce((acc, w) => {
			const activities = survey?.partC?.activities?.[w.key] || {};
			acc[w.key] = {
				componentVisits: activities.componentVisits ?? 0,
				areaVisits: activities.areaVisits ?? 0,
				newComponentFormationAttempts: activities.newComponentFormationAttempts ?? 0,
				newPersonConnections: activities.newPersonConnections ?? 0
			};
			return acc;
		}, {}),
		partC: {
			male: survey?.partD?.invitations?.male ?? 0,
			female: survey?.partD?.invitations?.female ?? 0
		},
		partD: GROWTH_WINGS.reduce((acc, w) => {
			const g = survey?.partE?.wingGrowth?.[w.key] || {};
			acc[w.key] = {
				newComponents: g.newComponents ?? 0,
				newMembers: g.newMembers ?? 0
			};
			return acc;
		}, {})
	};
}

export default function DistrictMonthlyStatsTable({ surveys, onRowClick }) {
	const [activePart, setActivePart] = useState('partA');
	const rows = useMemo(() => {
		const monthsWithData = new Set((surveys || []).map(s => s.month));
		return MONTHS.filter(m => monthsWithData.has(m));
	}, [surveys]);

	// Helper function to create a statistics table with horizontal layout
	const createStatsTable = (title, columns, getData) => {
		return (
			<div className="bg-white rounded-2xl shadow-lg border border-gray-200 w-full mb-6 hover:shadow-xl transition-all duration-300">
				<div className="px-6 py-4 border-b border-gray-200">
					<h3 className="text-lg font-bold text-[#002349]">{title}</h3>
				</div>
				<div className="overflow-x-auto">
					<table className="ih-table-compact w-full">
						<thead className="bg-gray-50">
							<tr>
								<th className="sticky left-0 bg-white z-[1] px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Month</th>
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
								const candidates = (surveys || []).filter(s => s.month === monthName);
								const survey = candidates.sort((a,b) => new Date(b.submittedAt) - new Date(a.submittedAt))[0];
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
										className="hover:bg-gradient-to-br hover:from-white hover:to-gray-50 cursor-pointer transition-all duration-200 group"
										onClick={handleRowClick}
										tabIndex={0}
										onKeyDown={(e) => {
											if (e.key === 'Enter') handleRowClick(e);
										}}
									>
										<td className="sticky left-0 bg-white z-[1] px-4 py-4 whitespace-nowrap text-sm font-semibold text-[#002349]">
											{monthName}
										</td>
										<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
											{survey?.year ?? (survey?.submittedAt ? new Date(survey.submittedAt).getFullYear() : '')}
										</td>
										{data.map((value, idx) => (
											<td key={idx} className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 font-medium group-hover:text-gray-900 transition-colors duration-200">
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
		{ key: 'partA', label: 'Part A – ജില്ലാ സബ്കമ്മിറ്റി ചേർന്നത്' },
		{ key: 'partB', label: 'Part B – ജില്ലാ സബ്കമ്മിറ്റി പ്രവർത്തനങ്ങൾ' },
		{ key: 'partC', label: 'Part C – പുതിയ വ്യക്തികളെ ക്ഷണിച്ചത്' },
		{ key: 'partD', label: 'Part D – റിപ്പോർട്ട് കാലയളവിലെ വര്‍ധനവ്' }
	];

	const renderActiveTable = () => {
		switch (activePart) {
			case 'partA':
				return createStatsTable(
					"Part A – ജില്ലാ സബ്കമ്മിറ്റി ചേർന്നത്",
					[
						"JIH – ഹാജർ", "JIH – ലീവ്", "JIH – ആബ്‌സന്റ്",
						"വനിത – ഹാജർ", "വനിത – ലീവ്", "വനിത – ആബ്‌സന്റ്",
						"സോളിഡാരിറ്റി – ഹാജർ", "സോളിഡാരിറ്റി – ലീവ്", "സോളിഡാരിറ്റി – ആബ്‌സന്റ്",
						"SIO – ഹാജർ", "SIO – ലീവ്", "SIO – ആബ്‌സന്റ്",
						"GIO – ഹാജർ", "GIO – ലീവ്", "GIO – ആബ്‌സന്റ്"
					],
					(survey) => {
						const v = extractValues(survey);
						return [
							v.partA.jih?.present ?? 0, v.partA.jih?.leave ?? 0, v.partA.jih?.absent ?? 0,
							v.partA.vanitha?.present ?? 0, v.partA.vanitha?.leave ?? 0, v.partA.vanitha?.absent ?? 0,
							v.partA.solidarity?.present ?? 0, v.partA.solidarity?.leave ?? 0, v.partA.solidarity?.absent ?? 0,
							v.partA.sio?.present ?? 0, v.partA.sio?.leave ?? 0, v.partA.sio?.absent ?? 0,
							v.partA.gio?.present ?? 0, v.partA.gio?.leave ?? 0, v.partA.gio?.absent ?? 0
						];
					}
				);
			case 'partB':
				return createStatsTable(
					"Part B – ജില്ലാ സബ്കമ്മിറ്റി പ്രവർത്തനങ്ങൾ",
					[
						"JIH – ഘടക സന്ദർശനങ്ങൾ", "JIH – ഏരിയ സന്ദർശനങ്ങൾ", "JIH – പുതിയ ഘടക ശ്രമങ്ങൾ", "JIH – പുതിയ വ്യക്തി ബന്ധങ്ങൾ",
						"വനിത – ഘടക സന്ദർശനങ്ങൾ", "വനിത – ഏരിയ സന്ദർശനങ്ങൾ", "വനിത – പുതിയ ഘടക ശ്രമങ്ങൾ", "വനിത – പുതിയ വ്യക്തി ബന്ധങ്ങൾ",
						"സോളിഡാരിറ്റി – ഘടക സന്ദർശനങ്ങൾ", "സോളിഡാരിറ്റി – ഏരിയ സന്ദർശനങ്ങൾ", "സോളിഡാരിറ്റി – പുതിയ ഘടക ശ്രമങ്ങൾ", "സോളിഡാരിറ്റി – പുതിയ വ്യക്തി ബന്ധങ്ങൾ",
						"SIO – ഘടക സന്ദർശനങ്ങൾ", "SIO – ഏരിയ സന്ദർശനങ്ങൾ", "SIO – പുതിയ ഘടക ശ്രമങ്ങൾ", "SIO – പുതിയ വ്യക്തി ബന്ധങ്ങൾ",
						"GIO – ഘടക സന്ദർശനങ്ങൾ", "GIO – ഏരിയ സന്ദർശനങ്ങൾ", "GIO – പുതിയ ഘടക ശ്രമങ്ങൾ", "GIO – പുതിയ വ്യക്തി ബന്ധങ്ങൾ"
					],
					(survey) => {
						const v = extractValues(survey);
						return [
							v.partB.jih?.componentVisits ?? 0, v.partB.jih?.areaVisits ?? 0, v.partB.jih?.newComponentFormationAttempts ?? 0, v.partB.jih?.newPersonConnections ?? 0,
							v.partB.vanitha?.componentVisits ?? 0, v.partB.vanitha?.areaVisits ?? 0, v.partB.vanitha?.newComponentFormationAttempts ?? 0, v.partB.vanitha?.newPersonConnections ?? 0,
							v.partB.solidarity?.componentVisits ?? 0, v.partB.solidarity?.areaVisits ?? 0, v.partB.solidarity?.newComponentFormationAttempts ?? 0, v.partB.solidarity?.newPersonConnections ?? 0,
							v.partB.sio?.componentVisits ?? 0, v.partB.sio?.areaVisits ?? 0, v.partB.sio?.newComponentFormationAttempts ?? 0, v.partB.sio?.newPersonConnections ?? 0,
							v.partB.gio?.componentVisits ?? 0, v.partB.gio?.areaVisits ?? 0, v.partB.gio?.newComponentFormationAttempts ?? 0, v.partB.gio?.newPersonConnections ?? 0
						];
					}
				);
			case 'partC':
				return createStatsTable(
					"Part C – പുതിയ വ്യക്തികളെ ക്ഷണിച്ചത്",
					["ആണ്‍", "പെണ്‍"],
					(survey) => {
						const v = extractValues(survey);
						return [v.partC.male, v.partC.female];
					}
				);
			case 'partD':
				return createStatsTable(
					"Part D – റിപ്പോർട്ട് കാലയളവിലെ വര്‍ധനവ്",
					[
						"JIH – പുതിയ ഘടകങ്ങൾ", "JIH – പുതുതായി വന്നവർ",
						"വനിത – പുതിയ ഘടകങ്ങൾ", "വനിത – പുതുതായി വന്നവർ",
						"സോളിഡാരിറ്റി – പുതിയ ഘടകങ്ങൾ", "സോളിഡാരിറ്റി – പുതുതായി വന്നവർ",
						"SIO – പുതിയ ഘടകങ്ങൾ", "SIO – പുതുതായി വന്നവർ",
						"GIO – പുതിയ ഘടകങ്ങൾ", "GIO – പുതുതായി വന്നവർ",
						"ടീൻ ഇന്ത്യ – പുതിയ ഘടകങ്ങൾ", "ടീൻ ഇന്ത്യ – പുതുതായി വന്നവർ",
						"മലർവാടി – പുതിയ ഘടകങ്ങൾ", "മലർവാടി – പുതുതായി വന്നവർ"
					],
					(survey) => {
						const v = extractValues(survey);
						return [
							v.partD.jih?.newComponents ?? 0, v.partD.jih?.newMembers ?? 0,
							v.partD.vanitha?.newComponents ?? 0, v.partD.vanitha?.newMembers ?? 0,
							v.partD.solidarity?.newComponents ?? 0, v.partD.solidarity?.newMembers ?? 0,
							v.partD.sio?.newComponents ?? 0, v.partD.sio?.newMembers ?? 0,
							v.partD.gio?.newComponents ?? 0, v.partD.gio?.newMembers ?? 0,
							v.partD.teenIndia?.newComponents ?? 0, v.partD.teenIndia?.newMembers ?? 0,
							v.partD.malarvadi?.newComponents ?? 0, v.partD.malarvadi?.newMembers ?? 0
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
				<div className="flex gap-3 overflow-x-auto pb-1">
					{partButtons.map((part) => (
						<button
							key={part.key}
							onClick={() => setActivePart(part.key)}
							className={`shrink-0 whitespace-nowrap px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-300 transform hover:scale-105 ${
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





