import * as XLSX from 'xlsx'

/**
 * Export a set of orders to a styled-ish .xlsx file.
 * Columns match the original app: الاسم / عدد الطلبات / المجموع بـ د.ج
 * plus a grand-total row.
 */
export function exportOrdersToExcel(orders, { sheetName = 'الطلبات', filePrefix = 'الطلبات' } = {}) {
  if (!orders || orders.length === 0) {
    return { error: 'لا توجد طلبات للتصدير' }
  }

  const rows = orders.map((o) => ({
    الاسم: o.customerName,
    'عدد الطلبات': o.quantity,
    'المجموع بـ د.ج': o.totalPrice,
  }))

  const totalQty = orders.reduce((sum, o) => sum + (Number(o.quantity) || 0), 0)
  const totalPrice = orders.reduce((sum, o) => sum + (Number(o.totalPrice) || 0), 0)
  rows.push({ الاسم: 'المجموع الكلي', 'عدد الطلبات': totalQty, 'المجموع بـ د.ج': totalPrice })

  const worksheet = XLSX.utils.json_to_sheet(rows)
  worksheet['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 20 }]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

  const date = new Date().toISOString().split('T')[0]
  XLSX.writeFile(workbook, `${filePrefix}_${date}.xlsx`)
  return { error: null }
}
