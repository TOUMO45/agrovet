import * as XLSX from 'xlsx'
import { orderUnitPrice } from './format'

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100

function download(rows, { sheetName, filePrefix, cols }) {
  const worksheet = XLSX.utils.json_to_sheet(rows)
  worksheet['!cols'] = cols
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  const date = new Date().toISOString().split('T')[0]
  XLSX.writeFile(workbook, `${filePrefix}_${date}.xlsx`)
}

/**
 * Export a set of orders to an .xlsx file:
 * الاسم / الهاتف / الكمية / سعر الوحدة / الإجمالي بـ د.ج / التاريخ, plus a grand-total row.
 */
export function exportOrdersToExcel(orders, { sheetName = 'الطلبات', filePrefix = 'الطلبات' } = {}) {
  if (!orders || orders.length === 0) {
    return { error: 'لا توجد طلبات للتصدير' }
  }

  const rows = orders.map((o) => ({
    الاسم: o.customerName,
    الهاتف: o.phoneNumber || '',
    الكمية: Number(o.quantity) || 0,
    'سعر الوحدة': round2(orderUnitPrice(o)),
    'الإجمالي بـ د.ج': round2(o.totalPrice),
    التاريخ: o.date ? new Date(o.date).toLocaleDateString('fr-DZ') : '',
  }))

  const totalQty = orders.reduce((sum, o) => sum + (Number(o.quantity) || 0), 0)
  const totalPrice = orders.reduce((sum, o) => sum + (Number(o.totalPrice) || 0), 0)
  rows.push({
    الاسم: 'المجموع الكلي',
    الهاتف: '',
    الكمية: totalQty,
    'سعر الوحدة': '',
    'الإجمالي بـ د.ج': round2(totalPrice),
    التاريخ: '',
  })

  try {
    download(rows, {
      sheetName,
      filePrefix,
      cols: [{ wch: 22 }, { wch: 16 }, { wch: 10 }, { wch: 12 }, { wch: 18 }, { wch: 14 }],
    })
    return { error: null }
  } catch (err) {
    console.error('Error exporting orders:', err)
    return { error: 'تعذّر تصدير الملف' }
  }
}

/**
 * Export completed sales:
 * الاسم / الهاتف / الكمية / سعر الوحدة / الإجمالي بـ د.ج / تاريخ البيع, plus totals.
 */
export function exportSalesToExcel(sales, { sheetName = 'المبيعات', filePrefix = 'المبيعات' } = {}) {
  if (!sales || sales.length === 0) {
    return { error: 'لا توجد مبيعات للتصدير' }
  }

  const rows = sales.map((s) => ({
    الاسم: s.customerName,
    الهاتف: s.phoneNumber || '',
    الكمية: Number(s.quantity) || 0,
    'سعر الوحدة': round2(orderUnitPrice(s)),
    'الإجمالي بـ د.ج': round2(s.totalPrice),
    'تاريخ البيع': s.soldAt ? new Date(s.soldAt).toLocaleString('fr-DZ') : '',
  }))

  const totalQty = sales.reduce((sum, s) => sum + (Number(s.quantity) || 0), 0)
  const totalRev = sales.reduce((sum, s) => sum + (Number(s.totalPrice) || 0), 0)
  rows.push({
    الاسم: 'الإجمالي',
    الهاتف: '',
    الكمية: totalQty,
    'سعر الوحدة': '',
    'الإجمالي بـ د.ج': round2(totalRev),
    'تاريخ البيع': '',
  })

  try {
    download(rows, {
      sheetName,
      filePrefix,
      cols: [{ wch: 22 }, { wch: 16 }, { wch: 10 }, { wch: 12 }, { wch: 18 }, { wch: 20 }],
    })
    return { error: null }
  } catch (err) {
    console.error('Error exporting sales:', err)
    return { error: 'تعذّر تصدير الملف' }
  }
}
