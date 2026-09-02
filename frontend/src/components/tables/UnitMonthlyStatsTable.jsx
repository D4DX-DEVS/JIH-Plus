import React, { useEffect, useMemo, useRef, useState } from 'react';

// Months in display order
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

// Extract required values from a survey with safe fallbacks
function getCellValues(survey) {
	return {
		workers: {
			rukkun: survey?.workers?.rukkun ?? 0,
			karkun: survey?.workers?.karkun ?? 0,
			activeAssociate: survey?.workers?.activeAssociate ?? 0
		},
		partA: {
			male: survey?.partA?.spokenPersons?.male ?? 0,
			female: survey?.partA?.spokenPersons?.female ?? 0
		},
		partB: {
			male: survey?.partB?.newJIHMembers?.male ?? 0,
			female: survey?.partB?.newJIHMembers?.female ?? 0
		},
		partC: {
			male: survey?.partC?.publicMeetingAttendees?.male ?? 0,
			female: survey?.partC?.publicMeetingAttendees?.female ?? 0
		},
		partD: {
			rukkun: {
				male: typeof survey?.partD?.growthAcceleration?.rukkun === 'object' 
					? (survey?.partD?.growthAcceleration?.rukkun?.male ?? 0)
					: (survey?.partD?.growthAcceleration?.rukkun ?? 0),
				female: typeof survey?.partD?.growthAcceleration?.rukkun === 'object' 
					? (survey?.partD?.growthAcceleration?.rukkun?.female ?? 0)
					: 0
			},
			karkun: {
				male: typeof survey?.partD?.growthAcceleration?.karkun === 'object' 
					? (survey?.partD?.growthAcceleration?.karkun?.male ?? 0)
					: (survey?.partD?.growthAcceleration?.karkun ?? 0),
				female: typeof survey?.partD?.growthAcceleration?.karkun === 'object' 
					? (survey?.partD?.growthAcceleration?.karkun?.female ?? 0)
					: 0
			},
			solidarity: {
				male: typeof survey?.partD?.growthAcceleration?.solidarity === 'object' 
					? (survey?.partD?.growthAcceleration?.solidarity?.male ?? 0)
					: (survey?.partD?.growthAcceleration?.solidarity ?? 0),
				female: typeof survey?.partD?.growthAcceleration?.solidarity === 'object' 
					? (survey?.partD?.growthAcceleration?.solidarity?.female ?? 0)
					: 0
			},
			sio: {
				male: typeof survey?.partD?.growthAcceleration?.sio === 'object' 
					? (survey?.partD?.growthAcceleration?.sio?.male ?? 0)
					: (survey?.partD?.growthAcceleration?.sio ?? 0),
				female: typeof survey?.partD?.growthAcceleration?.sio === 'object' 
					? (survey?.partD?.growthAcceleration?.sio?.female ?? 0)
					: 0
			},
			gio: {
				male: typeof survey?.partD?.growthAcceleration?.gio === 'object' 
					? (survey?.partD?.growthAcceleration?.gio?.male ?? 0)
					: (survey?.partD?.growthAcceleration?.gio ?? 0),
				female: typeof survey?.partD?.growthAcceleration?.gio === 'object' 
					? (survey?.partD?.growthAcceleration?.gio?.female ?? 0)
					: 0
			}
		}
	};
}

// Build a per-month map selecting the latest survey when multiple exist
function useLatestSurveyByMonth(surveys) {
	return useMemo(() => {
		const map = new Map();
		(surveys || []).forEach((s) => {
			const key = `${s.year || ''}-${s.month}`;
			const prev = map.get(key);
			if (!prev) {
				map.set(key, s);
				return;
			}
			const prevDate = new Date(prev.submittedAt || 0).getTime();
			const currDate = new Date(s.submittedAt || 0).getTime();
			if (currDate > prevDate) map.set(key, s);
		});
		return map;
	}, [surveys]);
}

export default function UnitMonthlyStatsTable({ surveys, onRowClick }) {
	const latestByMonth = useLatestSurveyByMonth(surveys);
	const [activePart, setActivePart] = useState('workers');

	// Rows are months that exist in surveys (based on submitted month names)
	const rows = useMemo(() => {
		const monthsWithData = new Set((surveys || []).map((s) => s.month));
		return MONTHS.filter((m) => monthsWithData.has(m));
	}, [surveys]);

	// Build matrix of focusable cells for keyboard navigation
	const cellRefs = useRef([]);
	useEffect(() => {
		cellRefs.current = rows.map(() => []);
	}, [rows.length]);

	const handleKeyDown = (rowIndex, colIndex) => (e) => {
		const key = e.key;
		const maxRow = rows.length - 1;
		// Column layout: Month | Year | Workers(3) | PartA(2) | PartB(2) | PartC(2) | PartD(5)
		const totalDataCols = 1 + 3 + 2 + 2 + 2 + 5;
		const maxCol = totalDataCols - 1;
		if (key === 'ArrowRight') {
			e.preventDefault();
			const nextCol = Math.min(colIndex + 1, maxCol);
			cellRefs.current[rowIndex]?.[nextCol]?.focus();
		}
		if (key === 'ArrowLeft') {
			e.preventDefault();
			const prevCol = Math.max(colIndex - 1, 0);
			cellRefs.current[rowIndex]?.[prevCol]?.focus();
		}
		if (key === 'ArrowDown') {
			e.preventDefault();
			const nextRow = Math.min(rowIndex + 1, maxRow);
			cellRefs.current[nextRow]?.[colIndex]?.focus();
		}
		if (key === 'ArrowUp') {
			e.preventDefault();
			const prevRow = Math.max(rowIndex - 1, 0);
			cellRefs.current[prevRow]?.[colIndex]?.focus();
		}
	};

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
		{ key: 'workers', label: 'പ്രവർത്തകർ (എണ്ണം)' },
		{ key: 'partA', label: 'Part A – സംസാരിച്ച വ്യക്തികൾ' },
		{ key: 'partB', label: 'Part B – പുതുതായി പ്രതിവാരയോഗത്തിൽ വന്നവർ' },
		{ key: 'partC', label: 'Part C – പൊതുയോഗത്തിൽ വന്നവർ' },
		{ key: 'partD', label: 'Part D – റിപ്പോർട്ട് കാലയളവിലെ വർധനവ്' }
	];

	const renderActiveTable = () => {
		switch (activePart) {
			case 'workers':
				return createStatsTable(
					"പ്രവർത്തകർ (എണ്ണം)",
					["റുക്ന്", "കാർകുന്", "ആക്ടീവ് അസോസിയേറ്റ്‌സ്"],
					(survey) => {
						const v = getCellValues(survey);
						return [v.workers.rukkun, v.workers.karkun, v.workers.activeAssociate];
					}
				);
			case 'partA':
				return createStatsTable(
					"Part A – സംസാരിച്ച വ്യക്തികൾ",
					["ആൺ", "പെൺ"],
					(survey) => {
						const v = getCellValues(survey);
						return [v.partA.male, v.partA.female];
					}
				);
			case 'partB':
				return createStatsTable(
					"Part B – പുതുതായി പ്രതിവാരയോഗത്തിൽ വന്നവർ",
					["ആൺ", "പെൺ"],
					(survey) => {
						const v = getCellValues(survey);
						return [v.partB.male, v.partB.female];
					}
				);
			case 'partC':
				return createStatsTable(
					"Part C – പൊതുയോഗത്തിൽ വന്നവർ",
					["ആൺ", "പെൺ"],
					(survey) => {
						const v = getCellValues(survey);
						return [v.partC.male, v.partC.female];
					}
				);
			case 'partD':
				return createStatsTable(
					"Part D – റിപ്പോർട്ട് കാലയളവിലെ വർധനവ്",
					["റുക്ന് (പുരുഷൻ)", "റുക്ന് (സ്ത്രീ)", "കാർകുന് (പുരുഷൻ)", "കാർകുന് (സ്ത്രീ)", "സോളിഡാരിറ്റി (പുരുഷൻ)", "സോളിഡാരിറ്റി (സ്ത്രീ)", "SIO (പുരുഷൻ)", "SIO (സ്ത്രീ)", "GIO (പുരുഷൻ)", "GIO (സ്ത്രീ)"],
					(survey) => {
						const v = getCellValues(survey);
						return [
							v.partD.rukkun.male, v.partD.rukkun.female,
							v.partD.karkun.male, v.partD.karkun.female,
							v.partD.solidarity.male, v.partD.solidarity.female,
							v.partD.sio.male, v.partD.sio.female,
							v.partD.gio.male, v.partD.gio.female
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


