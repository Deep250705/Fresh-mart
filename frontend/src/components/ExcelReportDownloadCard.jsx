import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Button, Form, Spinner } from 'react-bootstrap';
import { FaDownload, FaFileExcel, FaFilter } from 'react-icons/fa';
import { notifyError, notifySuccess } from '../utils/notify';

const buildDefaultCustomRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 6);

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
};

const ExcelReportDownloadCard = ({ authToken, role, vendorOptions = [] }) => {
  const [categories, setCategories] = useState([]);
  const [range, setRange] = useState('30days');
  const [vendorId, setVendorId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [customRange, setCustomRange] = useState(buildDefaultCustomRange);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data } = await axios.get('/api/categories');
        setCategories(Array.isArray(data) ? data : []);
      } catch (error) {
        notifyError(error.response?.data?.message || error.message || 'Failed to load categories');
      }
    };

    fetchCategories();
  }, []);

  const queryParams = useMemo(() => {
    const params = {
      range,
    };

    if (role === 'admin' && vendorId) {
      params.vendorId = vendorId;
    }

    if (categoryId) {
      params.categoryId = categoryId;
    }

    if (range === 'custom') {
      params.startDate = customRange.startDate;
      params.endDate = customRange.endDate;
    }

    return params;
  }, [categoryId, customRange.endDate, customRange.startDate, range, role, vendorId]);

  const parseBlobError = async (error) => {
    const data = error?.response?.data;

    if (data instanceof Blob) {
      try {
        const text = await data.text();
        const parsed = JSON.parse(text);
        return parsed?.message || text;
      } catch {
        return error.message;
      }
    }

    return error?.response?.data?.message || error.message || 'Failed to download Excel report';
  };

  const downloadReport = async () => {
    setDownloading(true);

    try {
      const { data, headers } = await axios.get('/api/reports/analytics', {
        params: queryParams,
        headers: { Authorization: `Bearer ${authToken}` },
        responseType: 'blob',
      });

      const disposition = headers['content-disposition'] || '';
      const filenameMatch = disposition.match(/filename="(.+?)"/i);
      const filename = filenameMatch?.[1] || 'analytics-report.xlsx';
      const blobUrl = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);

      notifySuccess('Excel report downloaded successfully.');
    } catch (error) {
      notifyError(await parseBlobError(error));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #f7fff9 0%, #edf4ff 100%)',
        border: '1px solid #dbe7e1',
        borderRadius: 18,
        padding: 22,
        boxShadow: '0 8px 22px rgba(15, 23, 42, 0.08)',
        marginBottom: 22,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #166534, #16a34a)',
                color: '#fff',
              }}
            >
              <FaFileExcel size={18} />
            </div>
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>Excel Analytics Report</div>
              <div style={{ fontSize: '0.86rem', color: '#475569' }}>
                Export the current delivered-order report into your pre-built Excel template.
              </div>
            </div>
          </div>
        </div>
        <Button
          onClick={downloadReport}
          disabled={downloading}
          style={{
            border: 'none',
            borderRadius: 12,
            padding: '10px 18px',
            fontWeight: 700,
            background: 'linear-gradient(135deg, #166534, #22c55e)',
            boxShadow: '0 10px 20px rgba(34, 197, 94, 0.22)',
            minWidth: 190,
          }}
        >
          {downloading ? <Spinner size="sm" animation="border" /> : <FaDownload style={{ marginRight: 8 }} />}
          {downloading ? 'Preparing...' : 'Download Excel Report'}
        </Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        <Form.Group>
          <Form.Label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
            <FaFilter size={11} style={{ marginRight: 6 }} />
            Date Range
          </Form.Label>
          <Form.Select value={range} onChange={(e) => setRange(e.target.value)}>
            <option value="7days">Last 7 days</option>
            <option value="30days">Last 30 days</option>
            <option value="custom">Custom range</option>
          </Form.Select>
        </Form.Group>

        {role === 'admin' ? (
          <Form.Group>
            <Form.Label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
              Vendor
            </Form.Label>
            <Form.Select value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
              <option value="">All vendors</option>
              {vendorOptions.map((vendor) => (
                <option key={vendor._id} value={vendor._id}>
                  {vendor.vendorDetails?.storeName || vendor.name}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        ) : null}

        <Form.Group>
          <Form.Label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
            Category
          </Form.Label>
          <Form.Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category._id} value={category._id}>
                {category.name}
              </option>
            ))}
          </Form.Select>
        </Form.Group>

        {range === 'custom' ? (
          <>
            <Form.Group>
              <Form.Label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                Start Date
              </Form.Label>
              <Form.Control
                type="date"
                value={customRange.startDate}
                onChange={(e) => setCustomRange((prev) => ({ ...prev, startDate: e.target.value }))}
              />
            </Form.Group>

            <Form.Group>
              <Form.Label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                End Date
              </Form.Label>
              <Form.Control
                type="date"
                value={customRange.endDate}
                onChange={(e) => setCustomRange((prev) => ({ ...prev, endDate: e.target.value }))}
              />
            </Form.Group>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default ExcelReportDownloadCard;
