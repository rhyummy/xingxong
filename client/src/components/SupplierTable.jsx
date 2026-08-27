export default function SupplierTable({ ranked, recommendedId }) {
  if (!ranked?.length) return null;

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Supplier</th>
            <th>Score</th>
            <th>Unit price</th>
            <th>Lead time</th>
            <th>Reliability</th>
            <th>Defect rate</th>
          </tr>
        </thead>
        <tbody>
          {ranked.map((s) => (
            <tr key={s.id} className={s.id === recommendedId ? 'row-recommended' : ''}>
              <td>
                {s.name}
                {s.id === recommendedId && <span className="badge badge-ok">selected</span>}
              </td>
              <td>{s.score}</td>
              <td>${s.price.toFixed(2)}</td>
              <td>{s.leadTimeDays}d</td>
              <td>{s.reliabilityScore}</td>
              <td>{s.defectRatePct}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
