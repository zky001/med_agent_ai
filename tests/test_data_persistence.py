from data_persistence import load_data, save_data


def test_load_and_save_data(tmp_path, monkeypatch):
    vec_file = tmp_path / "vec.json"
    upload_file = tmp_path / "upl.json"
    monkeypatch.setattr('data_persistence.VECTOR_STORE_FILE', vec_file)
    monkeypatch.setattr('data_persistence.UPLOADED_FILES_FILE', upload_file)

    sample_vec = [{"id": 1}]
    sample_up = [{"name": "file"}]
    save_data(sample_vec, sample_up)

    loaded_vec, loaded_up = load_data()
    assert loaded_vec == sample_vec
    assert loaded_up == sample_up
