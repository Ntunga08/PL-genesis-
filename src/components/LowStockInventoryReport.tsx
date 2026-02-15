import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Printer, AlertTriangle, Package } from 'lucide-react';
import { format } from 'date-fns';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface Medication {
  id: string;
  name: string;
  generic_name?: string;
  dosage_form?: string;
  strength?: string;
  stock_quantity?: number;
  quantity_in_stock?: number;
  reorder_level: number;
  unit_price: number;
  manufacturer?: string;
}

export default function LowStockInventoryReport() {
  const { user } = useAuth();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMedications();
  }, []);

  const fetchMedications = async () => {
    try {
      setLoading(true);
      const response = await api.get('/pharmacy/medications');
      setMedications(response.data.medications || []);
    } catch (error) {

      toast.error('Failed to load medications');
    } finally {
      setLoading(false);
    }
  };

  const lowStockMeds = medications.filter(m => 
    (m.stock_quantity || m.quantity_in_stock || 0) <= m.reorder_level
  );

  const handlePrint = () => {
    if (lowStockMeds.length === 0) {
      toast.info('No low stock items to print');
      return;
    }

    // Create a new window for printing with proper title
    const printWindow = window.open('', 'LowStockReport', 'width=800,height=600,scrollbars=yes,resizable=yes');
    if (!printWindow) {
      toast.error('Please allow popups for printing');
      return;
    }

    // Generate report ID
    const reportId = `INV-LSR-${format(new Date(), 'yyyyMMdd')}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    
    // Count critical items
    const criticalItems = lowStockMeds.filter(med => (med.stock_quantity || med.quantity_in_stock || 0) <= 5);

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Low Stock Inventory Report</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            line-height: 1.4;
            color: #000;
          }
          
          .header {
            text-align: center;
            border-bottom: 3px solid #dc2626;
            padding: 20px 0;
            margin-bottom: 25px;
          }
          
          .logo {
            width: 80px;
            height: 80px;
            margin: 0 auto 15px;
            display: block;
          }
          
          .hospital-name {
            font-size: 28px;
            font-weight: bold;
            color: #dc2626;
            margin: 10px 0;
            text-transform: uppercase;
          }
          
          .report-title {
            font-size: 20px;
            color: #991b1b;
            margin: 5px 0;
            font-weight: 600;
          }
          
          .contact-info {
            font-size: 12px;
            color: #7f1d1d;
            margin: 3px 0;
          }
          
          .alert-box {
            background: #fef2f2;
            border: 2px solid #dc2626;
            padding: 15px;
            margin: 20px 0;
            text-align: center;
          }
          
          .alert-title {
            font-size: 16px;
            font-weight: bold;
            color: #991b1b;
            margin-bottom: 5px;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            border: 2px solid #dc2626;
          }
          
          th {
            background: #fee2e2;
            padding: 12px 8px;
            text-align: left;
            font-weight: bold;
            border: 1px solid #dc2626;
            color: #991b1b;
            font-size: 14px;
          }
          
          td {
            padding: 10px 8px;
            border: 1px solid #cbd5e1;
            font-size: 13px;
          }
          
          .critical-row {
            background: #fef2f2;
          }
          
          .status-critical {
            color: #dc2626;
            font-weight: bold;
          }
          
          .status-low {
            color: #f59e0b;
            font-weight: bold;
          }
          
          .footer {
            margin-top: 30px;
            border-top: 2px solid #dc2626;
            padding-top: 15px;
            text-align: center;
            font-size: 11px;
          }
          
          .disclaimer {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            padding: 10px;
            margin-top: 20px;
            font-size: 10px;
            text-align: center;
          }
          
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="/placeholder.svg" alt="Hospital Logo" class="logo" />
          <div class="hospital-name">Hospital Management System</div>
          <div class="report-title">🚨 LOW STOCK INVENTORY REPORT</div>
          <div class="contact-info">📍 [Address to be configured]</div>
          <div class="contact-info">📞 [Phone to be configured] | ✉️ [Email to be configured]</div>
          <div class="contact-info">Pharmacy Department - Inventory Management</div>
        </div>

        <div class="alert-box">
          <div class="alert-title">⚠️ INVENTORY ALERT</div>
          <div class="alert-text">
            Report ID: ${reportId} | Generated: ${format(new Date(), 'PPP')} at ${format(new Date(), 'p')}<br>
            Total Low Stock Items: <strong>${lowStockMeds.length}</strong> | Critical Items (≤5 units): <strong>${criticalItems.length}</strong>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Medication Name</th>
              <th>Generic Name</th>
              <th>Form</th>
              <th>Strength</th>
              <th>Current Stock</th>
              <th>Reorder Level</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${lowStockMeds.map((med) => {
              const stock = med.stock_quantity || med.quantity_in_stock || 0;
              const isCritical = stock <= 5;
              return `
                <tr${isCritical ? ' class="critical-row"' : ''}>
                  <td><strong>${med.name}</strong></td>
                  <td>${med.generic_name || 'Not specified'}</td>
                  <td>${med.dosage_form || 'Tablet'}</td>
                  <td>${med.strength || '-'}</td>
                  <td style="text-align: center;"><strong>${stock}</strong></td>
                  <td style="text-align: center;">${med.reorder_level}</td>
                  <td class="${isCritical ? 'status-critical' : 'status-low'}">
                    ${isCritical ? '🔴 CRITICAL' : '⚠️ Low Stock'}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <div class="footer">
          <div><strong>Pharmacy Department</strong> | Hospital Management System</div>
          <div><strong>Report Generated:</strong> ${format(new Date(), 'PPP')} at ${format(new Date(), 'p')}</div>
          <div><strong>Generated by:</strong> ${user?.name || user?.full_name || 'Admin'}</div>
          
          <div class="disclaimer">
            <strong>URGENT ACTION REQUIRED</strong><br>
            This report shows medications with stock levels at or below reorder thresholds.<br>
            Critical items (≤5 units) require immediate reordering to prevent stockouts.<br>
            <strong>Contact Procurement:</strong> [Phone to be configured] | <strong>Report ID:</strong> ${reportId}
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Wait for content to load, then print
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
    
    // Fallback if onload doesn't fire
    setTimeout(() => {
      if (!printWindow.closed) {
        printWindow.print();
        printWindow.close();
      }
    }, 1000);
    
    toast.success('Print dialog opened');
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Low Stock Inventory</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Package className="h-8 w-8 animate-pulse text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          #low-stock-report-print h1 {
            font-size: 18pt !important;
            font-weight: bold !important;
            text-align: center !important;
            margin-bottom: 20px !important;
            color: #dc2626 !important;
            border-bottom: 2px solid #dc2626 !important;
            padding-bottom: 10px !important;
          }
            
            #low-stock-report-print table {
              width: 100% !important;
              border-collapse: collapse !important;
              margin-top: 20px !important;
            }
            
            #low-stock-report-print th,
            #low-stock-report-print td {
              border: 1px solid #ccc !important;
              padding: 8px !important;
              text-align: left !important;
            }
            
            #low-stock-report-print th {
              background-color: #fee2e2 !important;
              color: #991b1b !important;
              font-weight: bold !important;
              -webkit-print-color-adjust: exact !important;
            }
            
            #low-stock-report-print tbody tr:nth-child(even) {
              background-color: #f9f9f9 !important;
              -webkit-print-color-adjust: exact !important;
            }
            
            #low-stock-report-print .critical {
              background-color: #fef2f2 !important;
              -webkit-print-color-adjust: exact !important;
            }
          }
        `}</style>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Low Stock Inventory
            </CardTitle>
            <CardDescription>
              {lowStockMeds.length} medication(s) below reorder level
            </CardDescription>
          </div>
          <Button onClick={handlePrint} disabled={lowStockMeds.length === 0}>
            <Printer className="h-4 w-4 mr-2" />
            Print Report
          </Button>
        </CardHeader>
        <CardContent>
          {lowStockMeds.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p>All medications are adequately stocked</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Medication</TableHead>
                <TableHead>Form</TableHead>
                <TableHead>Strength</TableHead>
                <TableHead>Current Stock</TableHead>
                <TableHead>Reorder Level</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lowStockMeds.map((med) => {
                const stock = med.stock_quantity || med.quantity_in_stock || 0;
                const isCritical = stock <= 5;
                return (
                  <TableRow key={med.id} className={isCritical ? 'bg-red-50' : ''}>
                    <TableCell>
                      <div className="font-medium">{med.name}</div>
                      {med.generic_name && (
                        <div className="text-sm text-muted-foreground">{med.generic_name}</div>
                      )}
                    </TableCell>
                    <TableCell>{med.dosage_form || 'Tablet'}</TableCell>
                    <TableCell>{med.strength || '-'}</TableCell>
                    <TableCell className="font-semibold">{stock}</TableCell>
                    <TableCell>{med.reorder_level}</TableCell>
                    <TableCell>
                      <Badge variant={isCritical ? 'destructive' : 'secondary'}>
                        {isCritical ? 'Critical' : 'Low Stock'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>

    {/* Hidden Print View */}
    {lowStockMeds.length > 0 && (
      <div id="low-stock-report-print" style={{ display: 'none' }}>
        <div style={{ fontFamily: 'Arial, sans-serif', padding: '20px 30px', lineHeight: '1.4' }}>
          {/* Header with Logo */}
          <div style={{ marginBottom: '20px', borderBottom: '2px solid #dc2626', paddingBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
              {/* Hospital Logo */}
              <div style={{ width: '80px', height: '95px', flexShrink: 0 }}>
                <img 
                  src="/placeholder.svg" 
                  alt="Hospital Logo" 
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>
              
              {/* Hospital Info */}
              <div style={{ flex: 1, textAlign: 'center', paddingLeft: '20px' }}>
                <h1 style={{ margin: '0 0 8px 0', fontSize: '32px', color: '#1e40af', fontWeight: 'bold', letterSpacing: '1.5px' }}>
                  HASET HOSPITAL
                </h1>
                <p style={{ margin: '0', fontSize: '13px', color: '#6b7280', lineHeight: '1.5' }}>
                  Excellence in Healthcare | Comprehensive Medical Services
                </p>
              </div>
              
              {/* Report Info */}
              <div style={{ width: '80px', textAlign: 'right' }}>
                <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '4px' }}>Report Date</div>
                <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#1e40af', fontFamily: 'monospace' }}>
                  {format(new Date(), 'dd/MM/yyyy')}
                </div>
              </div>
            </div>
            
            <div style={{ textAlign: 'center', paddingTop: '15px', borderTop: '1px solid #e2e8f0' }}>
              <p style={{ margin: '0 0 6px 0', fontSize: '18px', color: '#dc2626', fontWeight: '600' }}>🚨 LOW STOCK INVENTORY REPORT</p>
              <p style={{ margin: '0', fontSize: '12px', color: '#6b7280' }}>
                Generated on {format(new Date(), 'PPP')} at {format(new Date(), 'p')}
              </p>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                Generated by: {user?.name || user?.full_name || 'Admin'}
              </p>
            </div>
          </div>

          {/* Summary */}
          <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px' }}>
            <p style={{ margin: '0', fontSize: '14px', fontWeight: 'bold', color: '#991b1b' }}>
              Total Low Stock Items: {lowStockMeds.length}
            </p>
            <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#7f1d1d' }}>
              Critical items (≤5 units) are highlighted in red
            </p>
          </div>

          {/* Medications Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
            <thead>
              <tr style={{ backgroundColor: '#fee2e2' }}>
                <th style={{ border: '1px solid #ccc', padding: '12px', textAlign: 'left', color: '#991b1b', fontWeight: 'bold' }}>Medication Name</th>
                <th style={{ border: '1px solid #ccc', padding: '12px', textAlign: 'left', color: '#991b1b', fontWeight: 'bold' }}>Generic Name</th>
                <th style={{ border: '1px solid #ccc', padding: '12px', textAlign: 'left', color: '#991b1b', fontWeight: 'bold' }}>Form</th>
                <th style={{ border: '1px solid #ccc', padding: '12px', textAlign: 'left', color: '#991b1b', fontWeight: 'bold' }}>Strength</th>
                <th style={{ border: '1px solid #ccc', padding: '12px', textAlign: 'left', color: '#991b1b', fontWeight: 'bold' }}>Current Stock</th>
                <th style={{ border: '1px solid #ccc', padding: '12px', textAlign: 'left', color: '#991b1b', fontWeight: 'bold' }}>Reorder Level</th>
                <th style={{ border: '1px solid #ccc', padding: '12px', textAlign: 'left', color: '#991b1b', fontWeight: 'bold' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {lowStockMeds.map((med, index) => {
                const stock = med.stock_quantity || med.quantity_in_stock || 0;
                const isCritical = stock <= 5;
                return (
                  <tr key={med.id} style={{ 
                    backgroundColor: isCritical ? '#fef2f2' : (index % 2 === 0 ? '#f9f9f9' : 'white')
                  }}>
                    <td style={{ border: '1px solid #ccc', padding: '8px', fontWeight: 'bold' }}>{med.name}</td>
                    <td style={{ border: '1px solid #ccc', padding: '8px' }}>{med.generic_name || 'Not specified'}</td>
                    <td style={{ border: '1px solid #ccc', padding: '8px' }}>{med.dosage_form || 'Tablet'}</td>
                    <td style={{ border: '1px solid #ccc', padding: '8px' }}>{med.strength || '-'}</td>
                    <td style={{ border: '1px solid #ccc', padding: '8px', fontWeight: 'bold' }}>{stock}</td>
                    <td style={{ border: '1px solid #ccc', padding: '8px' }}>{med.reorder_level}</td>
                    <td style={{ border: '1px solid #ccc', padding: '8px', color: isCritical ? '#dc2626' : '#f59e0b', fontWeight: 'bold' }}>
                      {isCritical ? '🔴 CRITICAL' : '⚠️ Low Stock'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Footer */}
          <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #ddd', fontSize: '12px', color: '#666', textAlign: 'center' }}>
            <p style={{ margin: '0 0 5px 0' }}>This report shows all medications with stock levels at or below their reorder level.</p>
            <p style={{ margin: '0' }}>Please reorder highlighted items immediately to maintain adequate stock levels.</p>
          </div>
        </div>
      </div>
    )}
  </>
  );
}
