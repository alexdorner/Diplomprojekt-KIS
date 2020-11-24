frappe.provide("frappe.patient_history");
frappe.pages['patient_history'].on_page_load = function(wrapper) {
	var me = this;
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Patient History',
		single_column: true
	});

	frappe.breadcrumbs.add("Healthcare");
	let pid = '';
	page.main.html(frappe.render_template("patient_history", {}));
	var patient = frappe.ui.form.make_control({
		parent: page.main.find(".patient"),
		df: {
			fieldtype: "Link",
			options: "Patient",
			fieldname: "patient",
			change: function(){
				if(pid != patient.get_value() && patient.get_value()){
					me.start = 0;
					me.page.main.find(".patient_documents_list").html("");
					get_documents(patient.get_value(), me);
					show_patient_info(patient.get_value(), me);
					show_patient_vital_charts(patient.get_value(), me, "bp", "mmHg", "Blood Pressure");
				}
				pid = patient.get_value();
			}
		},
		only_input: true,
	});
	patient.refresh();

	if (frappe.route_options){
		patient.set_value(frappe.route_options.patient);
	}

	this.page.main.on("click", ".btn-show-chart", function() {
		var	btn_show_id = $(this).attr("data-show-chart-id"), pts = $(this).attr("data-pts");
		var title = $(this).attr("data-title");
		show_patient_vital_charts(patient.get_value(), me, btn_show_id, pts, title);
	});

	this.page.main.on("click", ".btn-more", function() {
		var	doctype = $(this).attr("data-doctype"), docname = $(this).attr("data-docname");
		if(me.page.main.find("."+docname).parent().find('.document-html').attr('data-fetched') == "1"){
			me.page.main.find("."+docname).hide();
			me.page.main.find("."+docname).parent().find('.document-html').show();
		}else{
			if(doctype && docname){
				let exclude = ["patient", "patient_name"];
				frappe.call({
					method: "erpnext.healthcare.utils.render_doc_as_html",
					args:{
						doctype: doctype,
						docname: docname,
						exclude_fields: exclude
					},
					callback: function(r) {
						if (r.message){
							me.page.main.find("."+docname).hide();
							me.page.main.find("."+docname).parent().find('.document-html').html(r.message.html+"\
							<div align='center'><a class='btn octicon octicon-chevron-up btn-default btn-xs\
							btn-less' data-doctype='"+doctype+"' data-docname='"+docname+"'></a></div>");
							me.page.main.find("."+docname).parent().find('.document-html').show();
							me.page.main.find("."+docname).parent().find('.document-html').attr('data-fetched', "1");
						}
					},
					freeze: true
				});
			}
		}
	});

	this.page.main.on("click", ".btn-less", function() {
		docname = $(this).attr("data-docname");
		me.page.main.find("."+docname).parent().find('.document-id').show();
		me.page.main.find("."+docname).parent().find('.document-html').hide();
	});
	me.start = 0;
	me.page.main.on("click", ".btn-get-records", function(e){
		get_documents(patient.get_value(), me);
	});
}

var get_documents = function(patient, me){
	frappe.call({
		"method": "erpnext.healthcare.page.patient_history.patient_history.get_feed",
		args: {
			name: patient,
			start: me.start,
			page_length: 20
		},
		callback: function (r) {
			var data = r.message;
			if(data.length){
				add_to_records(me, data)
			}else{
				me.page.main.find(".patient_documents_list").append("<div class='text-muted' align='center'><br><br>No more records..<br><br></div>");
				me.page.main.find(".btn-get-records").hide();
			}
		}
	});
};

var add_to_records = function(me, data){
	var details = "<ul class='nav nav-pills nav-stacked'>";
	var i;
	for(i=0; i<data.length; i++){
		if(data[i].reference_doctype){
			let label = '';
			if(data[i].subject){
				label += "<br/>"+data[i].subject;
			}
			data[i] = add_date_separator(data[i])
			if(frappe.user_info(data[i].owner).image){
				data[i].imgsrc = frappe.utils.get_file_link(frappe.user_info(data[i].owner).image);
			}
			else{
				data[i].imgsrc = false;
			}
			var time_line_heading = data[i].practitioner ? `${data[i].practitioner} ` : ``
			time_line_heading += data[i].reference_doctype + " - "+ data[i].reference_name;
			details += `<li data-toggle='pill' class='patient_doc_menu'
			data-doctype='${data[i].reference_doctype}' data-docname='${data[i].reference_name}'>
			<div class='col-sm-12 d-flex border-bottom py-3'>`
			if (data[i].imgsrc){
				details += `<span class='mr-3'>
					<img class='avtar' src='${data[i].imgsrc}' width='32' height='32'>
					</img>
			</span>`;
			}else{
				details += `<span class='mr-3 avatar avatar-small' style='width:32px; height:32px;'><div align='center' class='standard-image'
					style='background-color: #fafbfc;'>${data[i].practitioner ? data[i].practitioner.charAt(0) : "U"}</div></span>`;
			}
			details += `<div class='d-flex flex-column width-full'>
					<div>
						`+time_line_heading+` on
							<span>
								${data[i].date_sep}
							</span>
					</div>
					<div class='Box p-3 mt-2'>
						<span class='${data[i].reference_name} document-id'>${label}
							<div align='center'>
								<a class='btn octicon octicon-chevron-down btn-default btn-xs btn-more'
									data-doctype='${data[i].reference_doctype}' data-docname='${data[i].reference_name}'>
								</a>
							</div>
						</span>
						<span class='document-html' hidden  data-fetched="0">
						</span>
					</div>
				</div>
			</div>
			</li>`

		}
	}
	details += "</ul>";
	me.page.main.find(".patient_documents_list").append(details);
	me.start += data.length;
	if(data.length==20){
		me.page.main.find(".btn-get-records").show();
	}else{
		me.page.main.find(".btn-get-records").hide();
		me.page.main.find(".patient_documents_list").append("<div class='text-muted' align='center'><br><br>No more records..<br><br></div>");
	}
}

var add_date_separator = function(data) {
	var date = frappe.datetime.str_to_obj(data.creation);

	var diff = frappe.datetime.get_day_diff(frappe.datetime.get_today(), frappe.datetime.obj_to_str(date));
	if(diff < 1) {
		var pdate = 'Today';
	} else if(diff < 2) {
		pdate = 'Yesterday';
	} else {
		pdate = frappe.datetime.global_date_format(date);
	}
	data.date_sep = pdate;
	return data
}

var show_patient_info = function(patient, me){
	frappe.call({
		"method": "erpnext.healthcare.doctype.patient.patient.get_patient_detail",
		args: {
			patient: patient
		},
		callback: function (r) {
			var data = r.message;
			var details = "";
			if(data.image){
				details += "<div><img class='thumbnail' width=75% src='"+data.image+"'></div>";
			}
			details += "<b>" + data.patient_name +"</b><br>" + data.sex;
			if(data.email) details += "<br>" + data.email;
			if(data.mobile) details += "<br>" + data.mobile;
			if(data.patient_details) details += "<br><br><b>More info : </b> " + data.patient_details.replace("\n", "<br>");

			if(details){
				details = "<div style='padding-left:10px; font-size:13px;' align='center'>" + details + "</div>";
			}
			me.page.main.find(".patient_details").html(details);
		}
	});
}
