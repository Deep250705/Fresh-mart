import React, { useEffect, useState } from 'react';
import { Form, Modal, Button } from 'react-bootstrap';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { FaTrash, FaEdit, FaPlus, FaCheckCircle } from 'react-icons/fa';
import { confirmAction, notifyError, notifySuccess } from '../utils/notify';

const AdminCategories = () => {
  const [categories, setCategories] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState(null);
  
  const [categoryName, setCategoryName] = useState("");
  const [categoryImage, setCategoryImage] = useState("");
  const [categoryDesc, setCategoryDesc] = useState("");

  const { userInfo } = useSelector((state) => state.auth);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data } = await axios.get('/api/categories');
      setCategories(data);
    } catch (err) {
      console.error(err);
    }
  };

  const openModal = (category = null) => {
    if (category) {
      setIsEdit(true);
      setEditId(category._id);
      setCategoryName(category.name);
      setCategoryImage(category.image);
      setCategoryDesc(category.description || "");
    } else {
      setIsEdit(false);
      setEditId(null);
      setCategoryName("");
      setCategoryImage("");
      setCategoryDesc("");
    }
    setShowModal(true);
  };

  const uploadFileHandler = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("image", file);
    try {
      const { data } = await axios.post("/api/upload", formData, {
        headers: { "Content-Type": "multipart/form-data", Authorization: `Bearer ${userInfo.token}` },
      });
      setCategoryImage(data.image);
    } catch (error) {
      notifyError("Error uploading image: " + (error.response?.data?.message || error.message));
    }
  };

  const submitHandler = async (e) => {
    e.preventDefault();
    if (!categoryName) return;
    try {
      const getHeaders = () => ({ headers: { Authorization: `Bearer ${userInfo.token}` } });
      const payload = { name: categoryName, image: categoryImage, description: categoryDesc };
      
      if (isEdit) {
        await axios.put(`/api/categories/${editId}`, payload, getHeaders());
        notifySuccess("Category updated successfully!");
      } else {
        await axios.post("/api/categories", payload, getHeaders());
        notifySuccess("Category created successfully!");
      }
      setShowModal(false);
      fetchCategories();
    } catch (err) {
      notifyError("Failed: " + (err.response?.data?.message || err.message));
    }
  };

  const deleteHandler = async (id) => {
    const result = await confirmAction('Delete Category', 'Are you sure you want to delete this category?');
    if (result.isConfirmed) {
      try {
        await axios.delete(`/api/categories/${id}`, { headers: { Authorization: `Bearer ${userInfo.token}` } });
        fetchCategories();
        notifySuccess("Category deleted successfully.");
      } catch (err) {
        notifyError("Failed to delete: " + (err.response?.data?.message || err.message));
      }
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="fw-bold mb-0">Manage Categories</h4>
        <Button variant="success" onClick={() => openModal()} className="fw-bold">
          <FaPlus className="me-2" /> Add Category
        </Button>
      </div>

      <div className="ad-table-wrap shadow-sm rounded bg-white">
        <table className="table table-hover mb-0">
          <thead className="bg-light">
            <tr>
              <th className="py-3 px-4">Image</th>
              <th className="py-3 px-4">Name</th>
              <th className="py-3 px-4">Description</th>
              <th className="py-3 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.length === 0 ? (
              <tr><td colSpan="4" className="text-center py-4">No categories found.</td></tr>
            ) : categories.map(cat => (
              <tr key={cat._id}>
                <td className="align-middle px-4">
                  <img src={cat.image} alt={cat.name} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '8px' }} />
                </td>
                <td className="align-middle px-4 fw-bold">{cat.name}</td>
                <td className="align-middle px-4 text-muted">{cat.description}</td>
                <td className="align-middle text-center px-4">
                  <Button variant="outline-primary" size="sm" onClick={() => openModal(cat)} className="me-2">
                    <FaEdit />
                  </Button>
                  <Button variant="outline-danger" size="sm" onClick={() => deleteHandler(cat._id)}>
                    <FaTrash />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{isEdit ? 'Edit Category' : 'Create Category'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={submitHandler}>
            <Form.Group className="mb-3">
              <Form.Label>Category Name</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g. Fresh Vegetables"
                value={categoryName}
                required
                onChange={(e) => setCategoryName(e.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                type="text"
                placeholder="Short description"
                value={categoryDesc}
                onChange={(e) => setCategoryDesc(e.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-4">
              <Form.Label>Category Banner Image</Form.Label>
              <Form.Control type="file" onChange={uploadFileHandler} />
              {categoryImage && (
                <div style={{ marginTop: 8, color: "#15803d", fontSize: "0.82rem", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                  <FaCheckCircle size={12} /> Image uploaded successfully.
                </div>
              )}
            </Form.Group>
            <Button variant="primary" type="submit" className="w-100 fw-bold">
              {isEdit ? 'Update Category' : 'Create Category'}
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default AdminCategories;
