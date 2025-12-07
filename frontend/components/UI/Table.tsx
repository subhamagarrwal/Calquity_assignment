'use client';

interface Props {
  title?: string;
  headers: string[];
  rows: string[][];
}

export function Table({ title, headers, rows }: Props) {
  return (
    <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm overflow-x-auto">
      {title && (
        <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
      )}
      
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-gray-300">
            {headers.map((header, i) => (
              <th
                key={i}
                className="text-left py-3 px-4 font-semibold text-gray-700"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className="border-b border-gray-200 hover:bg-gray-50 transition"
            >
              {row.map((cell, j) => (
                <td key={j} className="py-3 px-4 text-gray-800">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}