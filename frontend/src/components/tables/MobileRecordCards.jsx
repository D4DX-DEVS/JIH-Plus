import React from 'react';

export default function MobileRecordCards({ records, onRowClick }) {
	return (
		<div className="space-y-3 sm:hidden">
			{records.map((record) => {
				const isInteractive = Boolean(onRowClick && record.survey);
				const Card = isInteractive ? 'button' : 'div';
				return (
					<Card
						key={record.key}
						type={isInteractive ? 'button' : undefined}
						className={`w-full rounded-xl border border-gray-200 bg-white p-3 text-left shadow-sm transition-all duration-200 ${isInteractive ? 'hover:shadow-md' : ''}`}
						onClick={isInteractive ? () => onRowClick(record.survey) : undefined}
					>
						<div className="mb-3 flex items-center justify-between gap-3 border-b border-gray-100 pb-3">
							<span className="text-sm font-semibold text-[#002349]">{record.month}</span>
							<span className="text-sm font-medium text-gray-600">{record.year}</span>
						</div>
						<div className="grid grid-cols-1 gap-2">
							{record.fields.map((field, index) => (
								<div key={`${record.key}-${index}`} className="flex items-start justify-between gap-4 text-sm">
									<span className="min-w-0 max-w-[50%] break-words text-gray-600 [overflow-wrap:anywhere]">{field.label}</span>
									<span className="min-w-0 max-w-[50%] break-words font-semibold text-gray-900 [overflow-wrap:anywhere]">{field.value}</span>
								</div>
							))}
						</div>
					</Card>
				);
			})}
		</div>
	);
}
